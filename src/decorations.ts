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
  // patterns that come first will be used first if possible
  const patterns = [
    "export default async function",
    "export default function",
    "export async function",
    "export function",
    "async function",
    "function",
    "export const",
    "const",
  ];

  const decorations: vscode.DecorationOptions[] = logs.map((log) => {
    // Create a range for the line where the error or success decoration should appear
    const line = log.fnLoc?.start.line - 1;
    const lineContent = editor.document.lineAt(line).text;

    const matchingPattern = patterns.find((pattern) =>
      lineContent.includes(pattern)
    );

    // Compute where to place the decoration within the line.
    // If a known pattern is present, place it right after the pattern; otherwise at column 0.
    const matchedIndex = matchingPattern
      ? lineContent.indexOf(matchingPattern)
      : -1;
    const hasMatch = matchedIndex !== -1;
    const patternLength = matchingPattern?.length ?? 0;
    const startPosition = hasMatch ? matchedIndex + patternLength : 0;

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
        "✨ This component has been auto-memoized by React Compiler.\n\n"
      );
      hoverMessage.appendMarkdown(
        `**[Preview compiled output 📄](command:react-compiler-marker.previewCompiled)**`
      );
    } else {
      hoverMessage.appendMarkdown(
        "**🚫 This component hasn't been memoized by React Compiler.**\n\n"
      );

      // Get the relevant code snippet around the error location
      const startLine = Math.max(0, (log.detail?.loc?.start.line ?? 1) - 1);
      const startChar = Math.max(0, log.detail?.loc?.start.column ?? 0);
      const endLine = Math.max(0, (log.detail?.loc?.end.line ?? 1) - 1);
      const endChar = Math.max(0, log.detail?.loc?.end.column ?? 0);
      const selectionCmd = `command:react-compiler-marker.revealSelection?${encodeURIComponent(
        JSON.stringify({
          start: { line: startLine, character: startChar },
          end: { line: endLine, character: endChar },
        })
      )}`;
      hoverMessage.appendMarkdown(`Reason: ${log?.detail?.reason}\n\n`);

      if (startLine || endLine) {
        hoverMessage.appendMarkdown(
          `**[What caused this?](${selectionCmd})** (${
            startLine === endLine
              ? `line ${startLine}`
              : `lines ${startLine}-${endLine}`
          })`
        );
      }

      // Add Fix with AI button
      const reason = log?.detail?.reason || "Unknown reason";
      const filename = editor.document.fileName || "Unknown file";
      const fixWithAICmd = `command:react-compiler-marker.fixWithAI?${encodeURIComponent(
        JSON.stringify({
          reason,
          filename,
          startLine,
          endLine,
        })
      )}`;
      hoverMessage.appendMarkdown(` **[Fix with AI 🤖💬](${fixWithAICmd})**`);
    }

    // Allow the hover link to be trusted
    hoverMessage.isTrusted = true;

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
