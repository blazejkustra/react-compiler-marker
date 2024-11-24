import * as vscode from "vscode";
import { detectFunctionComponents } from "./detectFunctionComponent";
import { checkReactCompiler, LoggerEvent } from "./checkReactCompiler";

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "react-compiler-marker" is now active!'
  );

  // Decorations for successful and failed compilations
  const magicSparksDecoration = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: " ✨",
    },
  });
  const blockIndicatorDecoration = vscode.window.createTextEditorDecorationType(
    {
      after: {
        contentText: " 🚫",
      },
    }
  );

  // Function to update decorations dynamically
  async function updateDecorationsForEditor(editor: vscode.TextEditor) {
    if (!editor) {
      return;
    }

    // Run your checkReactCompiler logic on the current file content
    const { successfulCompilations, failedCompilations } = checkReactCompiler(
      editor.document.getText(),
      editor.document.fileName
    );

    // Update decorations for successful and failed compilations
    await updateDecorations(
      editor,
      magicSparksDecoration,
      successfulCompilations
    );
    await updateDecorations(
      editor,
      blockIndicatorDecoration,
      failedCompilations
    );
  }

  // Listen for active text editor changes (e.g., user switches tabs)
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      updateDecorationsForEditor(editor);
    }
  });

  // Listen for file system changes (e.g., user edits files)
  vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;

    // If the editor contains the document that changed, update the decorations
    if (editor && event.document === editor.document) {
      updateDecorationsForEditor(editor);
    }
  });

  // Run decorations when the extension starts with the currently active editor
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    updateDecorationsForEditor(activeEditor);
  }
}

// Function to update text decorations
async function updateDecorations(
  editor: vscode.TextEditor,
  decorationType: vscode.TextEditorDecorationType,
  logs: LoggerEvent[]
) {
  const FUNCTION_LENGTH = 8;
  const CONST_LENGTH = 5;

  const decorations: vscode.DecorationOptions[] = logs.map((log) => {
    // Create a range for the line where the error or success decoration should appear
    const line = log.fnLoc.start.line - 1;
    const lineContent = editor.document.lineAt(line).text;

    const range = new vscode.Range(
      line,
      log.fnName || lineContent.includes("function")
        ? FUNCTION_LENGTH
        : CONST_LENGTH,
      line,
      log.fnName || lineContent.includes("function")
        ? FUNCTION_LENGTH
        : CONST_LENGTH
    );
    return { range };
  });

  console.log(`%%% decorations`, JSON.stringify(logs, null, 2));

  // Apply decorations to the editor
  editor.setDecorations(decorationType, decorations);
}

// This method is called when your extension is deactivated
export function deactivate() {}
