import * as vscode from "vscode";
import { getThrottledFunction, isVSCode, isAntigravity } from "./utils";
import { updateDecorationsForEditor, loadDecorations } from "./decorations";
import { logError, logMessage } from "./logger";
import { getCompiledOutput } from "./checkReactCompiler";
import { generateAIPrompt } from "./prompt";

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext): void {
  logMessage(
    'Congratulations, your extension "react-compiler-marker" is now active!'
  );

  // Load the persisted `isActivated` state or default to `true`
  let isActivated = context.globalState.get<boolean>("isActivated", true);

  // Create a getter function to always get the current state
  const getIsActivated = () => isActivated;
  const setIsActivated = (value: boolean) => {
    context.globalState.update("isActivated", value);
    isActivated = value;
  };

  // Throttled function for performance
  const throttledUpdateDecorations = getThrottledFunction(
    updateDecorationsForEditor,
    300
  );

  registerCommands(
    context,
    throttledUpdateDecorations,
    getIsActivated,
    setIsActivated
  );

  registerListeners(throttledUpdateDecorations, getIsActivated);

  // Apply decorations for the active editor on activation, if activated
  if (isActivated) {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      try {
        updateDecorationsForEditor(activeEditor);
      } catch (error: any) {
        logError(`Critical error updating decorations: ${error?.message}`);
      }
    }
  }

  logMessage("React Compiler Marker ✨: Initialization complete.");
}

// This method is called when your extension is deactivated
export function deactivate(): void {
  logMessage("React Compiler Marker ✨ deactivated.");
}

/**
 * Registers all commands for the React Compiler Marker ✨ extension.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  throttledUpdateDecorations: (editor: vscode.TextEditor) => void,
  getIsActivated: () => boolean,
  setIsActivated: (value: boolean) => void
): void {
  // Register the Refresh command
  const refreshCommand = vscode.commands.registerCommand(
    "react-compiler-marker.checkOnce",
    () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage("No active editor to check.");
        return;
      }

      updateDecorationsForEditor(activeEditor);
      vscode.window.showInformationMessage(
        "React Compiler Markers refreshed ✨"
      );
    }
  );

  // Register the Activate command
  const activateCommand = vscode.commands.registerCommand(
    "react-compiler-marker.activate",
    () => {
      if (getIsActivated()) {
        vscode.window.showInformationMessage(
          "React Compiler Marker ✨ is already activated."
        );
        return;
      }

      setIsActivated(true);

      // Apply decorations for the current active editor
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        throttledUpdateDecorations(activeEditor);
      }

      vscode.window.showInformationMessage(
        "React Compiler Marker ✨ activated!"
      );
    }
  );

  // Register the Deactivate command
  const deactivateCommand = vscode.commands.registerCommand(
    "react-compiler-marker.deactivate",
    () => {
      if (!getIsActivated()) {
        vscode.window.showInformationMessage(
          "React Compiler Marker ✨ is already deactivated."
        );
        return;
      }

      setIsActivated(false);

      // Clear all decorations in all open editors
      vscode.window.visibleTextEditors.forEach((editor) => {
        editor.setDecorations(
          vscode.window.createTextEditorDecorationType({}),
          []
        );
      });

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
      const source = document.getText();
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
            const compiled = await getCompiledOutput(source, filename);
            const compiledDoc = await vscode.workspace.openTextDocument({
              language: "typescriptreact",
              content: compiled,
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

/**
 * Helper to register event listeners
 */
function registerListeners(
  throttledUpdateDecorations: (editor: vscode.TextEditor) => void,
  getIsActivated: () => boolean
): void {
  // Listener for text editor changes (e.g., switching tabs)
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (getIsActivated() && editor) {
      throttledUpdateDecorations(editor);
    }
  });

  // Listener for document changes (e.g., typing in the editor)
  vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (getIsActivated() && editor && event.document === editor.document) {
      throttledUpdateDecorations(editor);
    }
  });

  // Listener for emoji config changes
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("reactCompilerMarker")) {
      loadDecorations();
      const editor = vscode.window.activeTextEditor;
      if (getIsActivated() && editor) {
        throttledUpdateDecorations(editor);
      }
    }
  });

  logMessage("React Compiler Marker ✨: Event listeners registered.");
}
