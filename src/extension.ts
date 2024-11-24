import * as vscode from "vscode";
import { updateDecorationsForEditor } from "./decorations";
import { getThrottledFunction } from "./utils";

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext): void {
  console.log(
    'Congratulations, your extension "react-compiler-marker" is now active!'
  );

  // Load the persisted `isActivated` state or default to `true`
  let isActivated = context.globalState.get<boolean>("isActivated", true);

  // Throttled function for performance
  const throttledUpdateDecorations = getThrottledFunction(
    updateDecorationsForEditor,
    300
  );

  registerCommands(
    context,
    throttledUpdateDecorations,
    isActivated,
    (value: boolean) => {
      context.globalState.update("isActivated", value);
      isActivated = value;
    }
  );

  registerListeners(throttledUpdateDecorations, isActivated);

  // Apply decorations for the active editor on activation, if activated
  if (isActivated) {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      updateDecorationsForEditor(activeEditor);
    }
  }

  console.log("React Compiler Marker ✨: Initialization complete.");
}

// This method is called when your extension is deactivated
export function deactivate(): void {
  console.log("React Compiler Marker ✨ deactivated.");
}

/**
 * Registers all commands for the React Compiler Marker ✨ extension.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  throttledUpdateDecorations: (editor: vscode.TextEditor) => void,
  isActivated: boolean,
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
      if (isActivated) {
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
      if (!isActivated) {
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

  // Push all commands to the context's subscriptions
  context.subscriptions.push(
    refreshCommand,
    activateCommand,
    deactivateCommand
  );

  console.log("React Compiler Marker ✨: Commands registered.");
}

/**
 * Helper to register event listeners
 */
function registerListeners(
  throttledUpdateDecorations: (editor: vscode.TextEditor) => void,
  isActivated: boolean
): void {
  // Listener for text editor changes (e.g., switching tabs)
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (isActivated && editor) {
      throttledUpdateDecorations(editor);
    }
  });

  // Listener for document changes (e.g., typing in the editor)
  vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (isActivated && editor && event.document === editor.document) {
      throttledUpdateDecorations(editor);
    }
  });

  console.log("React Compiler Marker ✨: Event listeners registered.");
}
