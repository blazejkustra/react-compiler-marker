import * as vscode from "vscode";
import { checkReactCompiler, LoggerEvent } from "./checkReactCompiler";

let successDecoration: vscode.TextEditorDecorationType;
let errorDecoration: vscode.TextEditorDecorationType;
let currentSuccessEmoji: string | null | undefined;
let currentErrorEmoji: string | null | undefined;

function createDecorationType(
  contentText: string
): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    before: {
      contentText,
    },
  });
}

function parseLog(log: LoggerEvent) {
  // Helper function to get a value from multiple possible nested paths
  const getLocValue = (
    property: "start" | "end",
    field: "line" | "column",
    defaultValue: number
  ) => {
    return (
      log.detail?.options?.details?.at(0)?.loc?.[property]?.[field] ??
      log.detail?.options?.loc?.[property]?.[field] ??
      log.detail?.loc?.[property]?.[field] ??
      defaultValue
    );
  };

  const startLine = getLocValue("start", "line", 1);
  const endLine = getLocValue("end", "line", 1);
  const startChar = getLocValue("start", "column", 0);
  const endChar = getLocValue("end", "column", 0);

  const reason = log?.detail?.options?.reason || "Unknown reason";
  const description = log?.detail?.options?.description || "";

  return {
    startLine: Math.max(0, startLine - 1),
    endLine: Math.max(0, endLine - 1),
    startChar: Math.max(0, startChar),
    endChar: Math.max(0, endChar),
    reason,
    description,
  };
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
    const functionLine = (log.fnLoc?.start?.line ?? 1) - 1;
    const lineContent = editor.document.lineAt(functionLine).text;

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
      functionLine,
      startPosition,
      functionLine,
      lineContent.length
    );

    const hoverMessage = new vscode.MarkdownString();

    if (log.kind === "CompileSuccess") {
      // Use hoverMessage for displaying Markdown tooltips
      hoverMessage.appendMarkdown(
        `${currentSuccessEmoji} This component has been auto-memoized by React Compiler.\n\n`
      );
      hoverMessage.appendMarkdown(
        `**[Preview compiled output 📄](command:react-compiler-marker.previewCompiled)**`
      );
    } else {
      hoverMessage.appendMarkdown(
        `**${currentErrorEmoji} This component hasn't been memoized by React Compiler.**\n\n`
      );

      const { startLine, endLine, startChar, endChar, reason, description } =
        parseLog(log);

      hoverMessage.appendMarkdown(
        `Reason: ${reason}\n\n${description ? `${description}\n\n` : ""}`
      );

      if (startLine || endLine) {
        const selectionCmd = `command:react-compiler-marker.revealSelection?${encodeURIComponent(
          JSON.stringify({
            start: { line: startLine, character: startChar },
            end: { line: endLine, character: endChar },
          })
        )}`;

        hoverMessage.appendMarkdown(
          `**[What caused this?](${selectionCmd})** (${
            startLine === endLine
              ? `line ${startLine}`
              : `lines ${startLine}-${endLine}`
          })`
        );
      }

      // Add Fix with AI button
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

// Function to load initial decorations
export function loadDecorations() {
  const config = vscode.workspace.getConfiguration("reactCompilerMarker");
  currentSuccessEmoji = config.get<string | null>("successEmoji");
  currentErrorEmoji = config.get<string | null>("errorEmoji");

  if (successDecoration) {
    successDecoration.dispose();
  }
  if (errorDecoration) {
    errorDecoration.dispose();
  }

  successDecoration = createDecorationType(
    currentSuccessEmoji ? " " + currentSuccessEmoji : ""
  );
  errorDecoration = createDecorationType(
    currentErrorEmoji ? " " + currentErrorEmoji : ""
  );
}

loadDecorations();

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
  await updateDecorations(editor, successDecoration, successfulCompilations);
  await updateDecorations(editor, errorDecoration, failedCompilations);
}

export { createDecorationType, updateDecorations, updateDecorationsForEditor };
