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
  const EXPORT_FUNCTION_LENGTH = 7 + FUNCTION_LENGTH;
  const EXPORT_DEFAULT_FUNCTION_LENGTH = 15 + FUNCTION_LENGTH;
  const CONST_LENGTH = 5;
  const EXPORT_CONST_LENGTH = 7 + CONST_LENGTH;

  const decorations: vscode.DecorationOptions[] = logs.map((log) => {
    // Create a range for the line where the error or success decoration should appear
    const line = log.fnLoc.start.line - 1;
    const lineContent = editor.document.lineAt(line).text;

    let startPosition = 0;

    if (lineContent.includes("export default function")) {
      startPosition = EXPORT_DEFAULT_FUNCTION_LENGTH;
    } else if (lineContent.includes("export function")) {
      startPosition = EXPORT_FUNCTION_LENGTH;
    } else if (lineContent.includes("function")) {
      startPosition = FUNCTION_LENGTH;
    } else if (lineContent.includes("export const")) {
      startPosition = EXPORT_CONST_LENGTH;
    } else if (lineContent.includes("const")) {
      startPosition = CONST_LENGTH;
    }

    const range = new vscode.Range(
      line,
      startPosition,
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
