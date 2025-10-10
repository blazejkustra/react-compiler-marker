import * as vscode from "vscode";
import { updateDecorationsForEditor } from "./decorations";
import { getThrottledFunction } from "./utils";
import { logMessage } from "./logger";
import { getCompiledOutput, checkReactCompiler, LoggerEvent } from "./checkReactCompiler";
import { copyErrorToClipboard } from "./errorPromptGenerator";

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
      updateDecorationsForEditor(activeEditor);
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
              language: "typescript",
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

  // Register the Copy Error to Clipboard command
  const copyErrorCommand = vscode.commands.registerCommand(
    "react-compiler-marker.copyError",
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage("No active editor to check for errors.");
        return;
      }

      const document = activeEditor.document;
      const source = document.getText();
      const filename = document.fileName;

      if (!filename || document.isUntitled) {
        vscode.window.showErrorMessage(
          "Please save the file before copying error information."
        );
        return;
      }

      try {
        const { failedCompilations } = checkReactCompiler(source, filename);
        
        if (failedCompilations.length === 0) {
          vscode.window.showInformationMessage(
            "No React Compiler errors found in this file. ✨"
          );
          return;
        }

        if (failedCompilations.length === 1) {
          // If there's only one error, copy it directly
          await copyErrorToClipboard(failedCompilations[0], source, filename);
        } else {
          // If there are multiple errors, show a quick pick to select which one
          const items = failedCompilations.map((error, index) => ({
            label: `${error.fnName ?? 'Unknown Component'} (line ${error.fnLoc.start.line})`,
            description: error.detail?.reason ?? 'Unknown error',
            error: error,
            index: index
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: "Select error to copy:",
            title: "React Compiler Errors"
          });

          if (selected) {
            await copyErrorToClipboard(selected.error, source, filename);
          }
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to check for errors: ${error?.message ?? error}`
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
    copyErrorCommand
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

  logMessage("React Compiler Marker ✨: Event listeners registered.");
}
