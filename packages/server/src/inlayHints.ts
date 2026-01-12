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

type TooltipFormat = "markdown" | "html";

// Formatting helpers for building tooltips
const fmt = {
  markdown: {
    bold: (text: string) => `**${text}**`,
    link: (text: string, url: string) => `[${text}](${url})`,
    hr: () => "\n\n---\n\n",
    br: () => "\n",
    br2: () => "\n\n",
  },
  html: {
    bold: (text: string) => `<b>${text}</b>`,
    link: (text: string, url: string) => `<a href="${url}">${text}</a>`,
    hr: () => "<hr>",
    br: () => "<br>",
    br2: () => "<br><br>",
  },
} as const;

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
  const lineContent = document
    .getText({
      start: startOfLine,
      end: endOfLine,
    })
    .trimEnd();

  // Find the matching pattern
  const matchingPattern = FUNCTION_PATTERNS.find((pattern) => lineContent.includes(pattern));

  // Compute where to place the hint
  const matchedIndex = matchingPattern ? lineContent.indexOf(matchingPattern) : -1;
  const hasMatch = matchedIndex !== -1;
  const patternLength = matchingPattern?.length ?? 0;

  // Position after the pattern, or at end of line
  const hintPosition = hasMatch ? matchedIndex + patternLength + 1 : lineContent.length;

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
  errorEmoji: string | null,
  documentUri: string,
  tooltipFormat: TooltipFormat = "markdown",
  hintFormat: string = "{emoji}"
): InlayHint[] {
  const hints: InlayHint[] = [];

  // Generate hints for successful compilations
  if (successEmoji) {
    for (const log of successfulCompilations) {
      const positionInfo = getInlayHintPosition(document, log);
      if (!positionInfo) {
        continue;
      }

      const f = fmt[tooltipFormat];
      const tooltipValue =
        `${successEmoji} ${f.bold(positionInfo.functionName)} has been auto-memoized by React Compiler.` +
        f.br2() +
        f.bold(
          f.link("📄 Preview compiled output", "command:react-compiler-marker.previewCompiled")
        );

      // Format the hint label based on template
      const labelText = hintFormat
        .replace(/{emoji}/g, successEmoji)
        .replace(/{name}/g, positionInfo.functionName)
        .replace(/{status}/g, "optimized");

      const hint: InlayHint = {
        position: positionInfo.position,
        label: labelText + " ",
        kind: InlayHintKind.Type,
        tooltip: { kind: "markdown", value: tooltipValue },
      };

      hints.push(hint);
    }
  }

  // Generate hint for failed compilations (one hint with all errors)
  if (errorEmoji && failedCompilations.length > 0) {
    const f = fmt[tooltipFormat];
    let tooltipContent = `${errorEmoji} ${f.bold("This component hasn't been memoized by React Compiler.")}`;
    tooltipContent += f.hr();

    for (let i = 0; i < failedCompilations.length; i++) {
      const { reason, description, startLine, endLine, startChar, endChar } = parseLog(
        failedCompilations[i]
      );

      tooltipContent += `${f.bold(`Error ${i + 1}:`)} ${reason}${f.br2()}`;
      if (description) {
        tooltipContent += `${description}${f.br2()}`;
      }

      if (startLine !== undefined || endLine !== undefined) {
        const selectionCmd = `command:react-compiler-marker.revealSelection?${encodeURIComponent(
          JSON.stringify({
            uri: documentUri,
            start: { line: startLine, character: startChar },
            end: { line: endLine, character: endChar },
          })
        )}`;

        const lineText =
          startLine === endLine ? `Line ${startLine + 1}` : `Lines ${startLine + 1}–${endLine + 1}`;

        tooltipContent += f.bold(f.link(`📍 ${lineText}`, selectionCmd));
      }

      // Add Fix with AI button for this error (VSCode only - markdown format)
      if (tooltipFormat === "markdown") {
        const filename = documentUri.startsWith("file://") ? documentUri.slice(7) : documentUri;
        const fixWithAICmd = `command:react-compiler-marker.fixWithAI?${encodeURIComponent(
          JSON.stringify({
            reason,
            filename,
            startLine,
            endLine,
          })
        )}`;
        tooltipContent += ` ${f.bold(f.link("🤖 Fix with AI", fixWithAICmd))}`;
      }

      if (i < failedCompilations.length - 1) {
        tooltipContent += f.hr();
      }
    }

    const firstLog = failedCompilations[0];
    const positionInfo = getInlayHintPosition(document, firstLog);
    if (!positionInfo) {
      return [];
    }

    // Format the hint label based on template
    const labelText = hintFormat
      .replace(/{emoji}/g, errorEmoji)
      .replace(/{name}/g, positionInfo.functionName)
      .replace(/{status}/g, "failed");

    const hint: InlayHint = {
      position: positionInfo.position,
      label: labelText + " ",
      kind: InlayHintKind.Type,
      tooltip: { kind: "markdown", value: tooltipContent },
    };

    hints.push(hint);
  }

  return hints;
}
