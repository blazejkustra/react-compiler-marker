import { LoggerEvent } from "./checkReactCompiler";
import * as vscode from "vscode";

/**
 * Generates a comprehensive prompt for LLM about React Compiler error
 */
export function generateErrorPrompt(
  error: LoggerEvent,
  sourceCode: string,
  filename: string
) {
  // Note: We use a simple function name extraction which may not always work as expected,
  // especially with complex patterns, anonymous functions, or arrow functions.
  // For more robust function name detection, a full AST parser would be needed.
  const componentName = error.fnName || "Unknown Component";
  const errorReason = error.detail?.reason || "Unknown error";
  const errorLocation = error.detail?.loc;
  const suggestions = error.detail?.suggestions || [];

  // Extract the component code around the error location
  const componentCode = extractComponentCode(sourceCode, error.fnLoc);

  // Get file path relative to workspace
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const relativePath = workspaceFolder
    ? vscode.workspace.asRelativePath(filename)
    : filename;

  const prompt = `I have a problem with React Compiler in component "${componentName}" in file "${relativePath}".

**Error:**
${errorReason}

**Error location:**
Line ${errorLocation?.start.line ?? error.fnLoc.start.line}-${
    errorLocation?.end.line ?? error.fnLoc.end.line
  }

**Component code:**
\`\`\`typescript
${componentCode}
\`\`\`

**Context:**
React Compiler cannot optimize this component. I need help fixing this error so the component can be automatically memoized.

**Questions:**
1. What exactly causes this error?
2. How can I fix this code so React Compiler can optimize it?
3. Are there any best practices I should apply?

${
  suggestions.length > 0
    ? `**Compiler suggestions:**\n${suggestions
        .map((s) => `- ${s}`)
        .join("\n")}\n`
    : ""
}

Please provide a concrete solution with code example.`;

  return prompt;
}

/**
 * Extracts component code around the error location
 */
function extractComponentCode(sourceCode: string, fnLoc: any) {
  const lines = sourceCode.split("\n");
  const startLine = Math.max(0, fnLoc.start.line - 1);
  const endLine = Math.min(lines.length - 1, fnLoc.end.line + 5); // Add some context

  return lines.slice(startLine, endLine + 1).join("\n");
}

/**
 * Copies error information to clipboard with LLM prompt
 */
export async function copyErrorToClipboard(
  error: LoggerEvent,
  sourceCode: string,
  filename: string
) {
  const prompt = generateErrorPrompt(error, sourceCode, filename);

  try {
    await vscode.env.clipboard.writeText(prompt);
    vscode.window.showInformationMessage(
      "React Compiler error copied to clipboard! 📋"
    );
  } catch (error) {
    vscode.window.showErrorMessage("Failed to copy error to clipboard.");
  }
}
