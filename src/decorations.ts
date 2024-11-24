import * as vscode from "vscode";
import { checkReactCompiler, LoggerEvent } from "./checkReactCompiler";

function createDecorationType(
  contentText: string
): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    before: {
      contentText,
    },
  });
}

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
      lineContent.length
    );

    const hoverMessage = new vscode.MarkdownString();

    if (log.kind === "CompileSuccess") {
      // Use hoverMessage for displaying Markdown tooltips
      hoverMessage.appendMarkdown(
        "✨ This component has been auto-memoized by React Compiler."
      );
    } else {
      hoverMessage.appendMarkdown(
        "**🚫 This component hasn't been memoized by React Compiler.**\n\n"
      );
      hoverMessage.appendMarkdown(
        `Reason: ${log?.detail?.reason} **(line ${log.detail?.loc.start.line}-${log.detail?.loc.end.line})**`
      );
    }

    return { range, hoverMessage };
  });

  // Apply decorations to the editor
  editor.setDecorations(decorationType, decorations);
}

// Decorations for successful and failed compilations
const magicSparksDecoration = createDecorationType(" ✨");
const blockIndicatorDecoration = createDecorationType(" 🚫");

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
  await updateDecorations(editor, blockIndicatorDecoration, failedCompilations);
}

export { createDecorationType, updateDecorations, updateDecorationsForEditor };
