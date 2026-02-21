import * as path from "path";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import type { ReactCompilerReport } from "@react-compiler-marker/server/src/report";
import { buildReportTree } from "@react-compiler-marker/server/src/report";
import { ReportPanel } from "./report/ReportPanel";
import { ReportItem, ReportsTreeProvider } from "./sidebar/ReportsTreeProvider";

let client: LanguageClient;

// Output channel for logging
const outputChannel = vscode.window.createOutputChannel("React Compiler Marker ✨");

function logMessage(message: string): void {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] CLIENT LOG: ${message}`);
}

// Antigravity is an AI-focused VS Code fork (https://antigravity.dev)
function isAntigravity(): boolean {
  const appName = vscode.env.appName;
  return appName.toLowerCase().includes("antigravity");
}

function generateAIPrompt(
  reason: string,
  code: string,
  filename: string,
  startLine: number,
  endLine: number
): string {
  const lineRange = startLine === endLine ? `line ${startLine}` : `lines ${startLine}-${endLine}`;

  return `I have a React component that the React Compiler couldn't optimize. Here's the issue:

**File:** ${filename}
**Location:** ${lineRange}
**Reason:** ${reason}

**Code:**
\`\`\`ts
${code}
\`\`\`

Please help me fix this code so that the React Compiler can optimize it. The React Compiler automatically memoizes components and their dependencies, but it needs the code to follow certain patterns. Please provide the corrected code and explain what changes you made and why they help the React Compiler optimize the component.`;
}

export function activate(context: vscode.ExtensionContext): void {
  logMessage("react-compiler-marker is being activated!");

  // Load the persisted `isActivated` state or default to `true`
  let isActivated = context.globalState.get<boolean>("isActivated", true);

  // The server is located in the dist folder after bundling
  const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

  // Debug options for the server
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  // Server options
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "javascript" },
      { scheme: "file", language: "typescript" },
      { scheme: "file", language: "javascriptreact" },
      { scheme: "file", language: "typescriptreact" },
    ],
    synchronize: {
      configurationSection: "reactCompilerMarker",
    },
    outputChannel,
    markdown: {
      isTrusted: true,
    },
  };

  // Create the language client and start it
  client = new LanguageClient(
    "reactCompilerMarker",
    "React Compiler Marker",
    serverOptions,
    clientOptions
  );

  // Start the client (this also starts the server)
  client.start().then(() => {
    logMessage("React Compiler Marker LSP client started");

    // Send initial activation state to server
    if (!isActivated) {
      client.sendRequest("workspace/executeCommand", {
        command: "react-compiler-marker/deactivate",
      });
    }
  });

  // Set up sidebar tree view
  const storageUri = context.storageUri ?? context.globalStorageUri;
  const reportsProvider = new ReportsTreeProvider(storageUri);
  const treeView = vscode.window.createTreeView("react-compiler-marker.reportsView", {
    treeDataProvider: reportsProvider,
  });
  context.subscriptions.push(treeView);

  // Load reports and set initial badge
  reportsProvider.refresh().then(() => {
    const failedCount = reportsProvider.getLatestFailedCount();
    treeView.badge =
      failedCount > 0
        ? { value: failedCount, tooltip: `${failedCount} failed component(s) in latest report` }
        : undefined;
  });

  const updateBadge = () => {
    const failedCount = reportsProvider.getLatestFailedCount();
    treeView.badge =
      failedCount > 0
        ? { value: failedCount, tooltip: `${failedCount} failed component(s) in latest report` }
        : undefined;
  };

  // Register commands
  registerCommands(
    context,
    isActivated,
    (value: boolean) => {
      isActivated = value;
      context.globalState.update("isActivated", value);
    },
    async () => {
      await reportsProvider.refresh();
      updateBadge();
    }
  );

  // Register refreshReports command
  context.subscriptions.push(
    vscode.commands.registerCommand("react-compiler-marker.refreshReports", async () => {
      await reportsProvider.refresh();
      updateBadge();
    })
  );

  // Register openReport command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "react-compiler-marker.openReport",
      async (reportUri: vscode.Uri) => {
        try {
          const content = await vscode.workspace.fs.readFile(reportUri);
          const report = JSON.parse(Buffer.from(content).toString("utf8")) as ReactCompilerReport;
          const treeData = buildReportTree(report);
          const config = vscode.workspace.getConfiguration("reactCompilerMarker");
          const emojis = {
            success: config.get<string>("successEmoji") ?? "\u2728",
            error: config.get<string>("errorEmoji") ?? "\uD83D\uDEAB",
          };
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            vscode.window.showErrorMessage("Open a workspace folder to view the report.");
            return;
          }
          ReportPanel.createOrShow(context.extensionUri, workspaceFolder.uri, treeData, emojis);
        } catch (error: any) {
          vscode.window.showErrorMessage(`Failed to open report: ${error?.message ?? error}`);
        }
      }
    )
  );

  // Register deleteReport command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "react-compiler-marker.deleteReport",
      async (item: ReportItem) => {
        const confirm = await vscode.window.showWarningMessage(
          "Are you sure you want to delete this report?",
          { modal: true },
          "Delete"
        );
        if (confirm !== "Delete") {
          return;
        }
        try {
          await reportsProvider.deleteReport(item.reportUri);
          updateBadge();
        } catch (error: any) {
          vscode.window.showErrorMessage(`Failed to delete report: ${error?.message ?? error}`);
        }
      }
    )
  );

  logMessage("React Compiler Marker ✨: Initialization complete.");
}

function registerCommands(
  context: vscode.ExtensionContext,
  initialIsActivated: boolean,
  setIsActivated: (value: boolean) => void,
  onReportGenerated?: () => Promise<void>
): void {
  let isActivated = initialIsActivated;

  // Register the Refresh command
  const refreshCommand = vscode.commands.registerCommand(
    "react-compiler-marker.checkOnce",
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage("No active editor to check.");
        return;
      }

      await client.sendRequest("workspace/executeCommand", {
        command: "react-compiler-marker/checkOnce",
      });

      vscode.window.showInformationMessage("React Compiler Markers refreshed ✨");
    }
  );

  // Register the Activate command
  const activateCommand = vscode.commands.registerCommand(
    "react-compiler-marker.activate",
    async () => {
      if (isActivated) {
        vscode.window.showInformationMessage("React Compiler Marker ✨ is already activated.");
        return;
      }

      await client.sendRequest("workspace/executeCommand", {
        command: "react-compiler-marker/activate",
      });

      isActivated = true;
      setIsActivated(true);

      vscode.window.showInformationMessage("React Compiler Marker ✨ activated!");
    }
  );

  // Register the Deactivate command
  const deactivateCommand = vscode.commands.registerCommand(
    "react-compiler-marker.deactivate",
    async () => {
      if (!isActivated) {
        vscode.window.showInformationMessage("React Compiler Marker ✨ is already deactivated.");
        return;
      }

      await client.sendRequest("workspace/executeCommand", {
        command: "react-compiler-marker/deactivate",
      });

      isActivated = false;
      setIsActivated(false);

      vscode.window.showInformationMessage("React Compiler Marker ✨ deactivated!");
    }
  );

  // Register the Preview Compiled Output command
  const previewCompiled = vscode.commands.registerCommand(
    "react-compiler-marker.previewCompiled",
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage("No active editor to preview.");
        return;
      }

      const document = activeEditor.document;
      const filename = document.fileName;

      if (!filename || document.isUntitled) {
        vscode.window.showErrorMessage("Please save the file before previewing compiled output.");
        return;
      }

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "React Compiler: Compiling...",
            cancellable: false,
          },
          async () => {
            const result = (await client.sendRequest("workspace/executeCommand", {
              command: "react-compiler-marker/getCompiledOutput",
              arguments: [document.uri.toString()],
            })) as { success: boolean; code?: string; error?: string };

            if (!result.success || !result.code) {
              throw new Error(result.error || "Compilation failed");
            }

            const compiledDoc = await vscode.workspace.openTextDocument({
              language: "typescriptreact",
              content: result.code,
            });
            await vscode.window.showTextDocument(compiledDoc, {
              preview: true,
              viewColumn: vscode.ViewColumn.Beside,
            });
            await vscode.commands.executeCommand("editor.action.formatDocument");
          }
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to compile the current file: ${error?.message ?? error}`
        );
      }
    }
  );

  const generateReport = vscode.commands.registerCommand(
    "react-compiler-marker.generateReport",
    async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage("Open a workspace folder to generate a report.");
        return;
      }

      const storageBase = context.storageUri ?? workspaceFolder.uri;
      if (!storageBase) {
        vscode.window.showErrorMessage("No storage or workspace folder available.");
        return;
      }

      const reportId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "React Compiler: Generating report...",
            cancellable: false,
          },
          async (progress) => {
            let lastProcessed = 0;
            const progressDisposable = client.onNotification(
              "react-compiler-marker/reportProgress",
              (payload: { reportId: string; processed: number; total: number }) => {
                if (payload.reportId !== reportId) {
                  return;
                }
                if (payload.total === 0) {
                  progress.report({ message: "No matching files found", increment: 100 });
                  return;
                }
                const delta = payload.processed - lastProcessed;
                if (delta <= 0) {
                  return;
                }
                const increment = (delta / payload.total) * 100;
                lastProcessed = payload.processed;
                progress.report({
                  message: `Scanning ${payload.processed}/${payload.total} files`,
                  increment,
                });
              }
            );

            try {
              const config = vscode.workspace.getConfiguration("reactCompilerMarker");
              const result = (await client.sendRequest("workspace/executeCommand", {
                command: "react-compiler-marker/generateReport",
                arguments: [
                  {
                    root: workspaceFolder.uri.fsPath,
                    reportId,
                    excludeDirs: config.get<string[]>("excludedDirectories"),
                    includeExtensions: config.get<string[]>("supportedExtensions"),
                  },
                ],
              })) as { success: boolean; report?: ReactCompilerReport; error?: string };

              if (!result.success || !result.report) {
                throw new Error(result.error || "Report generation failed");
              }

              // Save raw JSON for reference
              const reportJson = JSON.stringify(result.report, null, 2);
              const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
              const reportsDir = vscode.Uri.joinPath(storageBase, "react-compiler-marker");
              await vscode.workspace.fs.createDirectory(reportsDir);
              const reportUri = vscode.Uri.joinPath(reportsDir, `report-${timestamp}.json`);
              await vscode.workspace.fs.writeFile(reportUri, Buffer.from(reportJson, "utf8"));

              // Notify sidebar to refresh
              if (onReportGenerated) {
                await onReportGenerated();
              }

              // Open visual report panel
              const treeData = buildReportTree(result.report);
              const emojis = {
                success: config.get<string>("successEmoji") ?? "✨",
                error: config.get<string>("errorEmoji") ?? "🚫",
              };
              ReportPanel.createOrShow(context.extensionUri, workspaceFolder.uri, treeData, emojis);
            } finally {
              progressDisposable.dispose();
            }
          }
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate report: ${error?.message ?? error}`);
      }
    }
  );

  // Register the Reveal Selection command
  const revealSelectionCmd = vscode.commands.registerCommand(
    "react-compiler-marker.revealSelection",
    (args: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    }) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor to reveal selection.");
        return;
      }

      if (!args?.start || !args?.end) {
        vscode.window.showErrorMessage("Invalid selection arguments.");
        return;
      }

      const start = new vscode.Position(args.start.line, args.start.character);
      const end = new vscode.Position(args.end.line, args.end.character);
      const range = new vscode.Range(start, end);

      editor.selection = new vscode.Selection(start, end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }
  );

  // Register the Fix with AI command
  const fixWithAICmd = vscode.commands.registerCommand(
    "react-compiler-marker.fixWithAI",
    async ({
      reason,
      filename,
      startLine,
      endLine,
    }: {
      reason: string;
      filename: string;
      startLine: number;
      endLine: number;
    }) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor to reveal selection.");
        return;
      }

      const errorStartLine = Math.max(0, startLine - 2);
      const errorEndLine = Math.min(editor.document.lineCount - 1, endLine + 2);
      const code = editor.document.getText(
        new vscode.Range(
          new vscode.Position(errorStartLine, 0),
          new vscode.Position(errorEndLine, editor.document.lineAt(errorEndLine).text.length)
        )
      );

      const prompt = generateAIPrompt(reason, code, filename, startLine, endLine);

      if (isAntigravity()) {
        await vscode.env.clipboard.writeText(prompt);
        await vscode.commands.executeCommand(
          "antigravity.prioritized.chat.openNewConversation",
          prompt
        );
        await vscode.window.showInformationMessage("Prompt copied. Press CMD+V in the chat.");
      } else {
        await vscode.commands.executeCommand("workbench.action.chat.open", prompt);
      }
    }
  );

  // Push all commands to the context's subscriptions
  context.subscriptions.push(
    refreshCommand,
    activateCommand,
    deactivateCommand,
    previewCompiled,
    generateReport,
    revealSelectionCmd,
    fixWithAICmd
  );

  logMessage("React Compiler Marker ✨: Commands registered.");
}

export function deactivate(): Thenable<void> | undefined {
  logMessage("React Compiler Marker ✨ deactivating...");
  if (!client) {
    return undefined;
  }
  return client.stop();
}
