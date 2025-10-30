import * as vscode from "vscode";
import { checkReactCompiler, LoggerEvent } from "./checkReactCompiler";
import { logMessage, logError } from "./logger";
import { isComponentDisabled } from "./utils/componentUtils";

let cachedResults: UnoptimizedComponent[] | null = null;

export function getCachedResults(): UnoptimizedComponent[] | null {
  return cachedResults;
}

export function clearCache(): void {
  cachedResults = null;
}

export interface UnoptimizedComponent {
  filePath: string;
  fileName: string;
  componentName: string;
  line: number;
  column: number;
  reason: string;
  detailLocation?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

function extractComponentName(log: LoggerEvent, fileContent: string): string {
  if (log.fnName) {
    return log.fnName;
  }

  const line = log.fnLoc.start.line - 1;
  const lines = fileContent.split("\n");
  if (line >= 0 && line < lines.length) {
    const lineContent = lines[line].trim();

    const patterns = [
      /export\s+default\s+(?:async\s+)?function\s+(\w+)/,
      /export\s+(?:async\s+)?function\s+(\w+)/,
      /(?:async\s+)?function\s+(\w+)/,
      /export\s+const\s+(\w+)\s*=/,
      /const\s+(\w+)\s*=/,
    ];

    for (const pattern of patterns) {
      const match = lineContent.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return "Anonymous Component";
}

function isFileIgnored(filePath: string, ignorePatterns: string[]): boolean {
  const relativePath = vscode.workspace.asRelativePath(filePath);

  for (const pattern of ignorePatterns) {
    const regex = new RegExp(
      pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".")
    );
    if (regex.test(relativePath)) {
      return true;
    }
  }

  return false;
}

export async function scanWorkspaceForUnoptimizedComponents(
  progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<UnoptimizedComponent[]> {
  const unoptimizedComponents: UnoptimizedComponent[] = [];

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("No workspace folder is open.");
  }

  const config = vscode.workspace.getConfiguration("reactCompilerMarker");
  const ignorePatterns = config.get<string[]>("ignorePatterns", [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/out/**",
    "**/*.test.{ts,tsx,js,jsx}",
    "**/*.spec.{ts,tsx,js,jsx}",
    "**/__tests__/**",
    "**/*.d.ts",
  ]);

  progress.report({ message: "Finding React files..." });

  const reactFiles = await vscode.workspace.findFiles(
    "**/*.{js,jsx,ts,tsx}",
    "**/node_modules/**"
  );

  if (reactFiles.length === 0) {
    logMessage("No React files found in workspace.");
    return unoptimizedComponents;
  }

  logMessage(`Found ${reactFiles.length} files to scan.`);

  const increment = 100 / reactFiles.length;

  for (let i = 0; i < reactFiles.length; i++) {
    const file = reactFiles[i];
    const fileName = file.fsPath.split("/").pop() || file.fsPath;

    if (isFileIgnored(file.fsPath, ignorePatterns)) {
      continue;
    }

    progress.report({
      message: `Scanning ${fileName} (${i + 1}/${reactFiles.length})`,
      increment,
    });

    try {
      const document = await vscode.workspace.openTextDocument(file);
      const sourceCode = document.getText();

      // Let React Compiler handle detection - it will return empty arrays for non-React files
      const { failedCompilations } = checkReactCompiler(
        sourceCode,
        file.fsPath
      );

      for (const failed of failedCompilations) {
        if (isComponentDisabled(sourceCode, failed.fnLoc.start.line)) {
          continue;
        }

        const componentName = extractComponentName(failed, sourceCode);

        const detailLocation = failed.detail?.loc
          ? {
              startLine: failed.detail.loc.start.line - 1,
              startColumn: failed.detail.loc.start.column,
              endLine: failed.detail.loc.end.line - 1,
              endColumn: failed.detail.loc.end.column,
            }
          : undefined;

        unoptimizedComponents.push({
          filePath: file.fsPath,
          fileName,
          componentName,
          line: failed.fnLoc.start.line - 1,
          column: failed.fnLoc.start.column,
          reason: failed.detail?.reason || "Unknown reason",
          detailLocation,
        });
      }
    } catch (error: any) {
      logError(`Failed to scan ${file.fsPath}: ${error?.message}`);
    }
  }

  logMessage(
    `Workspace scan complete. Found ${unoptimizedComponents.length} unoptimized components.`
  );

  cachedResults = unoptimizedComponents;
  return unoptimizedComponents;
}

