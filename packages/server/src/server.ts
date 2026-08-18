import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  InlayHintParams,
  InlayHint,
  ExecuteCommandParams,
  HoverParams,
  Hover,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import {
  checkReactCompiler,
  getCompiledOutput,
  clearPluginCache,
  clearCompilationCache,
  normalizeCompilationMode,
  DEFAULT_COMPILATION_MODE,
  type CompilationMode,
} from "./checkReactCompiler";
import { generateInlayHints, clipHintsToRange } from "./inlayHints";
import { debounce } from "./debounce";
import { shouldEnableHover } from "./clientUtils";
import { resolveWorkspaceFolderForUri, workspaceFolderUriToPath } from "./workspaceFolders";

import packageJson from "../package.json";
import { generateReport, buildReportTree, getReportHtml } from "./report/index";
const { version } = packageJson;

// Determine the connection type based on command line arguments
// - stdio: when started with --stdio flag (for WebStorm, Neovim, Sublime, etc.)
// - Node IPC: when started by VS Code language client (default)
const useStdio = process.argv.includes("--stdio");

// Create a connection for the server
// ProposedFeatures.all enables all LSP features including inlay hints
const connection = useStdio
  ? createConnection(ProposedFeatures.all, process.stdin, process.stdout)
  : createConnection(ProposedFeatures.all);

// Create a document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Store settings
interface Settings {
  successEmoji: string | null;
  errorEmoji: string | null;
  skippedEmoji: string | null;
  babelPluginPath: string;
  compilationMode: CompilationMode;
}

let globalSettings: Settings = {
  successEmoji: "✨",
  errorEmoji: "🚫",
  skippedEmoji: "⏭️",
  babelPluginPath: "node_modules/babel-plugin-react-compiler",
  compilationMode: DEFAULT_COMPILATION_MODE,
};

// Tooltip format preference from client (markdown or html)
type TooltipFormat = "markdown" | "html";
let tooltipFormat: TooltipFormat = "markdown";

// Store activation state
let isActivated = true;

// Store every open workspace folder, in the order the client reported them.
// A multi-root workspace can have a different babel-plugin-react-compiler per
// root, so each document must be analyzed against the root that contains it.
let workspaceFolders: string[] = [];

// The root used when a document belongs to no open folder, and the default
// target for report commands that do not name one.
function defaultWorkspaceFolder(): string | undefined {
  return workspaceFolders[0];
}

// Whether the client can notify us when folders are added or removed
let hasWorkspaceFolderCapability = false;

// Store client name
let clientName: string | undefined;

function logMessage(message: string): void {
  const timestamp = new Date().toISOString();
  connection.console.log(`[${timestamp}] SERVER LOG: ${message}`);
}

function logError(error: string): void {
  const timestamp = new Date().toISOString();
  connection.console.error(`[${timestamp}] SERVER ERROR: ${error}`);
}

connection.onInitialize((params: InitializeParams): InitializeResult => {
  workspaceFolders = (params.workspaceFolders ?? [])
    .map((folder) => workspaceFolderUriToPath(folder.uri))
    .filter((folder): folder is string => Boolean(folder));

  // Clients that predate `workspaceFolders` still send the deprecated rootUri.
  if (workspaceFolders.length === 0 && params.rootUri) {
    workspaceFolders = [workspaceFolderUriToPath(params.rootUri)];
  }

  // Store client name for feature detection
  clientName = params.clientInfo?.name;

  // Check for tooltip format preference in initialization options
  const initOptions = params.initializationOptions as { tooltipFormat?: TooltipFormat } | undefined;
  if (initOptions?.tooltipFormat === "html" || initOptions?.tooltipFormat === "markdown") {
    tooltipFormat = initOptions.tooltipFormat;
  }

  hasWorkspaceFolderCapability = Boolean(params.capabilities.workspace?.workspaceFolders);

  const hoverEnabled = shouldEnableHover(clientName);

  logMessage(
    `Client connected: ${clientName ?? "Unknown"} ${params.clientInfo?.version ?? ""} (tooltipFormat: ${tooltipFormat}, hover: ${hoverEnabled ? "enabled" : "disabled"})`
  );

  return {
    serverInfo: {
      name: "React Compiler Marker LSP",
      version,
    },
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      inlayHintProvider: true,
      hoverProvider: hoverEnabled,
      executeCommandProvider: {
        commands: [
          "react-compiler-marker/activate",
          "react-compiler-marker/deactivate",
          "react-compiler-marker/getCompiledOutput",
          "react-compiler-marker/checkOnce",
          "react-compiler-marker/generateReport",
          "react-compiler-marker/generateReportHtml",
        ],
      },
      workspace: {
        workspaceFolders: {
          supported: true,
          changeNotifications: true,
        },
      },
    },
  };
});

connection.onInitialized(() => {
  logMessage(
    `React Compiler Marker LSP Server initialized (workspace folders: ${
      workspaceFolders.length > 0 ? workspaceFolders.join(", ") : "none"
    })`
  );

  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((event) => {
      const removed = new Set(event.removed.map((folder) => workspaceFolderUriToPath(folder.uri)));
      workspaceFolders = workspaceFolders
        .filter((folder) => !removed.has(folder))
        .concat(event.added.map((folder) => workspaceFolderUriToPath(folder.uri)));

      // A removed root's plugin must not keep serving files, and cached results
      // may have been produced by it.
      clearPluginCache();
      clearCompilationCache();
      connection.languages.inlayHint.refresh();
      logMessage(`Workspace folders changed: ${workspaceFolders.join(", ") || "none"}`);
    });
  }
});

// Handle configuration changes
connection.onDidChangeConfiguration((change) => {
  const settings = change.settings?.reactCompilerMarker;
  if (settings) {
    const oldBabelPluginPath = globalSettings.babelPluginPath;
    globalSettings = {
      successEmoji: settings.successEmoji ?? "✨",
      errorEmoji: settings.errorEmoji ?? "🚫",
      skippedEmoji: settings.skippedEmoji ?? "⏭️",
      babelPluginPath: settings.babelPluginPath ?? "node_modules/babel-plugin-react-compiler",
      compilationMode: normalizeCompilationMode(settings.compilationMode),
    };

    // Clear caches if babel plugin path changed
    if (oldBabelPluginPath !== globalSettings.babelPluginPath) {
      clearPluginCache();
      clearCompilationCache();
    }
  }
  // Refresh inlay hints on all documents
  connection.languages.inlayHint.refresh();
});

// Handle inlay hints request with debouncing
connection.languages.inlayHint.on(async (params: InlayHintParams): Promise<InlayHint[] | null> => {
  if (!isActivated) {
    return null;
  }

  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  // Only process JS/TS/JSX/TSX files
  const languageId = document.languageId;
  if (!["javascript", "typescript", "javascriptreact", "typescriptreact"].includes(languageId)) {
    return null;
  }

  // Use document URI as the debounce key. The debounced computation covers the
  // whole document, so a burst of chunked requests for one file shares it; each
  // request then keeps only the hints inside the range it asked for.
  const hints = await debounce(params.textDocument.uri, () => {
    logMessage(`Process inlay hints for ${params.textDocument.uri}`);
    const fileName = params.textDocument.uri;
    const fileNameForCompiler = workspaceFolderUriToPath(fileName);
    const documentWorkspaceFolder = resolveWorkspaceFolderForUri(fileName, workspaceFolders);

    try {
      const sourceCode = document.getText();

      const { successfulCompilations, failedCompilations, skippedCompilations } =
        checkReactCompiler(
          sourceCode,
          fileNameForCompiler,
          documentWorkspaceFolder,
          globalSettings.babelPluginPath,
          globalSettings.compilationMode
        );

      return generateInlayHints(
        document,
        successfulCompilations,
        failedCompilations,
        skippedCompilations,
        globalSettings.successEmoji,
        globalSettings.errorEmoji,
        globalSettings.skippedEmoji,
        params.textDocument.uri,
        tooltipFormat,
        clientName
      );
    } catch (error: any) {
      logError(`Error checking React Compiler: ${error?.message}`);
      return null;
    }
  });

  return hints && clipHintsToRange(hints, params.range);
});

// Handle hover request (only enabled for Neovim client, as VSCode/IntelliJ have native inlay hint hover)
connection.onHover((params: HoverParams): Hover | null => {
  if (!isActivated) {
    return null;
  }

  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  // Only process JS/TS/JSX/TSX files
  const languageId = document.languageId;
  if (!["javascript", "typescript", "javascriptreact", "typescriptreact"].includes(languageId)) {
    return null;
  }

  const fileName = params.textDocument.uri;
  const fileNameForCompiler = workspaceFolderUriToPath(fileName);
  const documentWorkspaceFolder = resolveWorkspaceFolderForUri(fileName, workspaceFolders);
  const hoveredLine = params.position.line;

  try {
    const sourceCode = document.getText();

    const { successfulCompilations, failedCompilations, skippedCompilations } = checkReactCompiler(
      sourceCode,
      fileNameForCompiler,
      documentWorkspaceFolder,
      globalSettings.babelPluginPath,
      globalSettings.compilationMode
    );

    // Generate hints to find which components have hints on which lines
    const hints = generateInlayHints(
      document,
      successfulCompilations,
      failedCompilations,
      skippedCompilations,
      globalSettings.successEmoji,
      globalSettings.errorEmoji,
      globalSettings.skippedEmoji,
      params.textDocument.uri,
      tooltipFormat,
      clientName
    );

    // Find hint on the hovered line
    const hintOnLine = hints.find((hint) => hint.position.line === hoveredLine);

    if (hintOnLine && hintOnLine.tooltip) {
      // Return the tooltip as hover content
      return {
        contents: hintOnLine.tooltip,
      };
    }

    return null;
  } catch (error: any) {
    logError(`Error in hover: ${error?.message}`);
    return null;
  }
});

// Handle execute command
connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
  switch (params.command) {
    case "react-compiler-marker/activate":
      isActivated = true;
      connection.languages.inlayHint.refresh();
      return { success: true, activated: true };

    case "react-compiler-marker/deactivate":
      isActivated = false;
      connection.languages.inlayHint.refresh();
      return { success: true, activated: false };

    case "react-compiler-marker/getCompiledOutput": {
      const [uri] = params.arguments ?? [];
      if (!uri) {
        return { success: false, error: "No URI provided" };
      }

      const document = documents.get(uri);
      if (!document) {
        return { success: false, error: "Document not found" };
      }

      const fileUri = workspaceFolderUriToPath(uri);
      try {
        const compiled = await getCompiledOutput(
          document.getText(),
          fileUri,
          resolveWorkspaceFolderForUri(uri, workspaceFolders),
          globalSettings.babelPluginPath,
          globalSettings.compilationMode
        );
        return { success: true, code: compiled };
      } catch (error: any) {
        return { success: false, error: error?.message };
      }
    }

    case "react-compiler-marker/checkOnce": {
      // Force refresh inlay hints
      connection.languages.inlayHint.refresh();
      return { success: true };
    }

    case "react-compiler-marker/generateReport": {
      // Generate JSON data report
      const [options] = params.arguments ?? [];
      const reportRoot = options?.root ?? defaultWorkspaceFolder();
      if (!reportRoot) {
        return { success: false, error: "No workspace folder available" };
      }
      const reportId = options?.reportId;
      try {
        logMessage(`Generating report for ${reportRoot}`);
        const report = await generateReport({
          root: reportRoot,
          babelPluginPath: globalSettings.babelPluginPath,
          compilationMode: normalizeCompilationMode(
            options?.compilationMode ?? globalSettings.compilationMode
          ),
          maxConcurrency: options?.maxConcurrency,
          includeExtensions: options?.includeExtensions,
          excludeDirs: options?.excludeDirs,
          respectGitignore: options?.respectGitignore,
          onProgress: reportId
            ? (progress) => {
                connection.sendNotification("react-compiler-marker/reportProgress", {
                  reportId,
                  ...progress,
                });
              }
            : undefined,
        });
        logMessage(
          `Report generated: scanned=${report.totals.filesScanned} files=${report.totals.filesWithResults} success=${report.totals.successCount} failed=${report.totals.failedCount} skipped=${report.totals.skippedCount}`
        );
        return { success: true, report };
      } catch (error: any) {
        logError(`Report generation failed: ${error?.message ?? error}`);
        return { success: false, error: error?.message ?? "Failed to generate report" };
      }
    }
    case "react-compiler-marker/generateReportHtml": {
      // Generate report and return self-contained HTML page
      const [htmlOptions] = params.arguments ?? [];
      const htmlReportRoot = htmlOptions?.root ?? defaultWorkspaceFolder();
      if (!htmlReportRoot) {
        return { success: false, error: "No workspace folder available" };
      }
      const htmlReportId = htmlOptions?.reportId;
      try {
        logMessage(`Generating HTML report for ${htmlReportRoot}`);
        const report = await generateReport({
          root: htmlReportRoot,
          babelPluginPath: globalSettings.babelPluginPath,
          compilationMode: normalizeCompilationMode(
            htmlOptions?.compilationMode ?? globalSettings.compilationMode
          ),
          maxConcurrency: htmlOptions?.maxConcurrency,
          includeExtensions: htmlOptions?.includeExtensions,
          excludeDirs: htmlOptions?.excludeDirs,
          respectGitignore: htmlOptions?.respectGitignore,
          onProgress: htmlReportId
            ? (progress) => {
                connection.sendNotification("react-compiler-marker/reportProgress", {
                  reportId: htmlReportId,
                  ...progress,
                });
              }
            : undefined,
        });
        const treeData = buildReportTree(report);
        const emojis = {
          success: htmlOptions?.emojis?.success ?? globalSettings.successEmoji ?? "✨",
          error: htmlOptions?.emojis?.error ?? globalSettings.errorEmoji ?? "🚫",
          skipped: htmlOptions?.emojis?.skipped ?? globalSettings.skippedEmoji ?? "⏭️",
        };
        const html = getReportHtml({
          data: treeData,
          emojis,
          theme: htmlOptions?.theme,
          headExtra: htmlOptions?.headExtra,
          scriptExtra: htmlOptions?.scriptExtra,
        });
        logMessage(
          `HTML report generated: scanned=${report.totals.filesScanned} files=${report.totals.filesWithResults} success=${report.totals.successCount} failed=${report.totals.failedCount} skipped=${report.totals.skippedCount}`
        );
        return { success: true, html, report };
      } catch (error: any) {
        logError(`HTML report generation failed: ${error?.message ?? error}`);
        return { success: false, error: error?.message ?? "Failed to generate report" };
      }
    }

    default:
      return { success: false, error: "Unknown command" };
  }
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
