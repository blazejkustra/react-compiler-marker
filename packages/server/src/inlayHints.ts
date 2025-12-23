import { InlayHint, InlayHintKind, Position } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { LoggerEvent } from "./checkReactCompiler";

// Patterns that come first will be used first if possible
const FUNCTION_PATTERNS = [
  "export default async function",
  "export default function",
  "export async function",
  "export function",
  "async function",
  "function",
  "export const",
  "const",
];

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

function getInlayHintPosition(
  document: TextDocument,
  log: LoggerEvent
): { position: Position; functionName: string } | null {
  const functionLine = (log.fnLoc?.start?.line ?? 1) - 1;

  if (functionLine < 0 || functionLine >= document.lineCount) {
    return null;
  }

  const startOfLine = { line: functionLine, character: 0 };
  const endOfLine = { line: functionLine + 1, character: 0 };
  const lineContent = document.getText({
    start: startOfLine,
    end: endOfLine,
  }).trimEnd();

  // Find the matching pattern
  const matchingPattern = FUNCTION_PATTERNS.find((pattern) =>
    lineContent.includes(pattern)
  );

  // Compute where to place the hint
  const matchedIndex = matchingPattern
    ? lineContent.indexOf(matchingPattern)
    : -1;
  const hasMatch = matchedIndex !== -1;
  const patternLength = matchingPattern?.length ?? 0;

  // Position after the pattern, or at end of line
  const hintPosition = hasMatch
    ? matchedIndex + patternLength
    : lineContent.length;

  // Try to extract function name for the label
  const functionName = log.fnName || "Component";

  return {
    position: Position.create(functionLine, hintPosition),
    functionName,
  };
}

export function generateInlayHints(
  document: TextDocument,
  successfulCompilations: LoggerEvent[],
  failedCompilations: LoggerEvent[],
  successEmoji: string | null,
  errorEmoji: string | null
): InlayHint[] {
  const hints: InlayHint[] = [];

  // Generate hints for successful compilations
  if (successEmoji) {
    for (const log of successfulCompilations) {
      const positionInfo = getInlayHintPosition(document, log);
      if (!positionInfo) {
        continue;
      }

      const hint: InlayHint = {
        position: positionInfo.position,
        label: ` ${successEmoji}`,
        kind: InlayHintKind.Type,
        paddingLeft: true,
        tooltip: {
          kind: "markdown",
          value: `${successEmoji} **${positionInfo.functionName}** has been auto-memoized by React Compiler.`,
        },
      };

      hints.push(hint);
    }
  }

  // Generate hints for failed compilations
  if (errorEmoji) {
    for (const log of failedCompilations) {
      const positionInfo = getInlayHintPosition(document, log);
      if (!positionInfo) {
        continue;
      }

      const { reason, description, startLine, endLine } = parseLog(log);

      let tooltipContent = `${errorEmoji} **${positionInfo.functionName}** hasn't been memoized by React Compiler.\n\n`;
      tooltipContent += `**Reason:** ${reason}\n\n`;
      if (description) {
        tooltipContent += `${description}\n\n`;
      }
      if (startLine || endLine) {
        tooltipContent +=
          startLine === endLine
            ? `📍 Line ${startLine + 1}`
            : `📍 Lines ${startLine + 1}-${endLine + 1}`;
      }

      const hint: InlayHint = {
        position: positionInfo.position,
        label: ` ${errorEmoji}`,
        kind: InlayHintKind.Type,
        paddingLeft: true,
        tooltip: {
          kind: "markdown",
          value: tooltipContent,
        },
      };

      hints.push(hint);
    }
  }

  return hints;
}
