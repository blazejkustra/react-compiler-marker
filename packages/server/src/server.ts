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
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import {
  checkReactCompiler,
  getCompiledOutput,
  clearPluginCache,
  clearCompilationCache,
} from "./checkReactCompiler";
import { generateInlayHints } from "./inlayHints";
import { debounce } from "./debounce";

import packageJson from "../package.json";
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
  babelPluginPath: string;
}

let globalSettings: Settings = {
  successEmoji: "✨",
  errorEmoji: "🚫",
  babelPluginPath: "node_modules/babel-plugin-react-compiler",
};

// Store activation state
let isActivated = true;

// Store workspace folder
let workspaceFolder: string | undefined;

function logMessage(message: string): void {
  const timestamp = new Date().toISOString();
  connection.console.log(`[${timestamp}] SERVER LOG: ${message}`);
}

function logError(error: string): void {
  const timestamp = new Date().toISOString();
  connection.console.error(`[${timestamp}] SERVER ERROR: ${error}`);
}

connection.onInitialize((params: InitializeParams): InitializeResult => {
  workspaceFolder = params.workspaceFolders?.[0]?.uri;
  if (workspaceFolder?.startsWith("file://")) {
    workspaceFolder = workspaceFolder.slice(7);
  }

  // Log client info for debugging
  logMessage(
    `Client connected: ${params.clientInfo?.name ?? "Unknown"} ${params.clientInfo?.version ?? ""}`
  );

  return {
    serverInfo: {
      name: "React Compiler Marker LSP",
      version,
    },
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      inlayHintProvider: true,
      executeCommandProvider: {
        commands: [
          "react-compiler-marker/activate",
          "react-compiler-marker/deactivate",
          "react-compiler-marker/getCompiledOutput",
          "react-compiler-marker/checkOnce",
        ],
      },
    },
  };
});

connection.onInitialized(() => {
  logMessage("React Compiler Marker LSP Server initialized");
});

// Handle configuration changes
connection.onDidChangeConfiguration((change) => {
  const settings = change.settings?.reactCompilerMarker;
  if (settings) {
    const oldBabelPluginPath = globalSettings.babelPluginPath;
    globalSettings = {
      successEmoji: settings.successEmoji ?? "✨",
      errorEmoji: settings.errorEmoji ?? "🚫",
      babelPluginPath: settings.babelPluginPath ?? "node_modules/babel-plugin-react-compiler",
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

  // Use document URI as the debounce key
  return debounce(params.textDocument.uri, () => {
    const fileName = params.textDocument.uri;
    const fileNameForCompiler = fileName.startsWith("file://") ? fileName.slice(7) : fileName;

    logMessage(`Process inlay hints for ${params.textDocument.uri}`);

    try {
      const sourceCode = document.getText();
      const { successfulCompilations, failedCompilations } = checkReactCompiler(
        sourceCode,
        fileNameForCompiler,
        workspaceFolder,
        globalSettings.babelPluginPath
      );

      return generateInlayHints(
        document,
        successfulCompilations,
        failedCompilations,
        globalSettings.successEmoji,
        globalSettings.errorEmoji,
        params.textDocument.uri
      );
    } catch (error: any) {
      logError(`Error checking React Compiler: ${error?.message}`);
      return null;
    }
  });
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

      const fileUri = uri.startsWith("file://") ? uri.slice(7) : uri;
      try {
        const compiled = await getCompiledOutput(
          document.getText(),
          fileUri,
          workspaceFolder,
          globalSettings.babelPluginPath
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

    default:
      return { success: false, error: "Unknown command" };
  }
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
