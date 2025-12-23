import * as path from "path";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

// Output channel for logging
const outputChannel = vscode.window.createOutputChannel(
  "React Compiler Marker ✨"
);

function logMessage(message: string): void {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] LOG: ${message}`);
}

function logError(error: string): void {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] ERROR: ${error}`);
}

function isVSCode(): boolean {
  const appName = vscode.env.appName;
  return (
    appName.includes("Visual Studio Code") ||
    appName.includes("VSCode") ||
    appName.includes("VS Code")
  );
}

function isAntigravity(): boolean {
  const appName = vscode.env.appName;
  return appName.includes("Antigravity");
}

function generateAIPrompt(
  reason: string,
  code: string,
  filename: string,
  startLine: number,
  endLine: number
): string {
  const lineRange =
    startLine === endLine
      ? `line ${startLine}`
      : `lines ${startLine}-${endLine}`;

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

  // Register commands
  registerCommands(context, isActivated, (value: boolean) => {
    isActivated = value;
    context.globalState.update("isActivated", value);
  });

  logMessage("React Compiler Marker ✨: Initialization complete.");
}

function registerCommands(
  context: vscode.ExtensionContext,
  initialIsActivated: boolean,
  setIsActivated: (value: boolean) => void
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

      vscode.window.showInformationMessage(
        "React Compiler Markers refreshed ✨"
      );
    }
  );

  // Register the Activate command
  const activateCommand = vscode.commands.registerCommand(
    "react-compiler-marker.activate",
    async () => {
      if (isActivated) {
        vscode.window.showInformationMessage(
          "React Compiler Marker ✨ is already activated."
        );
        return;
      }

      await client.sendRequest("workspace/executeCommand", {
        command: "react-compiler-marker/activate",
      });

      isActivated = true;
      setIsActivated(true);

      vscode.window.showInformationMessage(
        "React Compiler Marker ✨ activated!"
      );
    }
  );

  // Register the Deactivate command
  const deactivateCommand = vscode.commands.registerCommand(
    "react-compiler-marker.deactivate",
    async () => {
      if (!isActivated) {
        vscode.window.showInformationMessage(
          "React Compiler Marker ✨ is already deactivated."
        );
        return;
      }

      await client.sendRequest("workspace/executeCommand", {
        command: "react-compiler-marker/deactivate",
      });

      isActivated = false;
      setIsActivated(false);

      vscode.window.showInformationMessage(
        "React Compiler Marker ✨ deactivated!"
      );
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
        vscode.window.showErrorMessage(
          "Please save the file before previewing compiled output."
        );
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
            const result = (await client.sendRequest(
              "workspace/executeCommand",
              {
                command: "react-compiler-marker/getCompiledOutput",
                arguments: [document.uri.toString()],
              }
            )) as { success: boolean; code?: string; error?: string };

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
            await vscode.commands.executeCommand(
              "editor.action.formatDocument"
            );
          }
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to compile the current file: ${error?.message ?? error}`
        );
      }
    }
  );

  // Register command to reveal and select a given range in the active editor
  const revealSelection = vscode.commands.registerCommand(
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
          new vscode.Position(
            errorEndLine,
            editor.document.lineAt(errorEndLine).text.length
          )
        )
      );

      const prompt = generateAIPrompt(
        reason,
        code,
        filename,
        startLine,
        endLine
      );

      if (isVSCode()) {
        await vscode.commands.executeCommand(
          "workbench.action.chat.open",
          prompt
        );
      } else if (isAntigravity()) {
        await vscode.env.clipboard.writeText(prompt);
        await vscode.commands.executeCommand(
          "antigravity.prioritized.chat.openNewConversation",
          prompt
        );
        await vscode.window.showInformationMessage(
          "Prompt copied. Press CMD+V in the chat."
        );
      } else {
        await vscode.env.clipboard.writeText(prompt);
        await vscode.commands.executeCommand(
          "composer.startComposerPrompt",
          prompt
        );
        await vscode.window.showInformationMessage(
          "Prompt copied. Press CMD+V in the chat."
        );
      }
    }
  );

  // Push all commands to the context's subscriptions
  context.subscriptions.push(
    refreshCommand,
    activateCommand,
    deactivateCommand,
    previewCompiled,
    revealSelection,
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
