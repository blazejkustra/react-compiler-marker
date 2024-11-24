import * as vscode from "vscode";

const outputChannel = vscode.window.createOutputChannel(
  "React Compiler Marker ✨"
);

function logMessage(message: string): void {
  // Add timestamp for better debugging
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] LOG: ${message}`);
}

function logError(error: string): void {
  // Add timestamp and error stack for better context
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] ERROR: ${error}`);
}

export { logMessage, logError };
