import fs from "fs/promises";
import type { Dirent } from "fs";
import os from "os";
import path from "path";
import { checkReactCompiler, LoggerEvent } from "./checkReactCompiler";

export interface ReactCompilerReport {
  generatedAt: string;
  totals: {
    filesScanned: number;
    filesWithResults: number;
    compiledFiles: number;
    failedFiles: number;
    successCount: number;
    failedCount: number;
  };
  files: Array<{
    path: string;
    success: LoggerEvent[];
    failed: LoggerEvent[];
  }>;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

export interface ReportOptions {
  root: string;
  babelPluginPath: string;
  maxConcurrency?: number;
  includeExtensions?: string[];
  excludeDirs?: string[];
}

const DEFAULT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const DEFAULT_EXCLUDES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".turbo",
]);

function isSourceFile(filePath: string, includeExtensions: Set<string>): boolean {
  return includeExtensions.has(path.extname(filePath).toLowerCase());
}

function shouldSkipDir(dirName: string, excludeDirs: Set<string>): boolean {
  return excludeDirs.has(dirName);
}

async function listSourceFiles(
  root: string,
  includeExtensions: Set<string>,
  excludeDirs: Set<string>
): Promise<string[]> {
  const files: string[] = [];
  const queue: string[] = [root];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    let entries: Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!shouldSkipDir(entry.name, excludeDirs)) {
          queue.push(fullPath);
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (isSourceFile(fullPath, includeExtensions)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
) {
  const results: R[] = new Array(items.length);
  let index = 0;
  const run = async () => {
    while (true) {
      const currentIndex = index++;
      if (currentIndex >= items.length) {
        return;
      }
      results[currentIndex] = await worker(items[currentIndex]);
    }
  };
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, () => run());
  await Promise.all(workers);
  return results;
}

export async function generateReport(options: ReportOptions): Promise<ReactCompilerReport> {
  const root = path.resolve(options.root);
  const includeExtensions = new Set(options.includeExtensions ?? Array.from(DEFAULT_EXTENSIONS));
  const excludeDirs = new Set(options.excludeDirs ?? Array.from(DEFAULT_EXCLUDES));
  const maxConcurrency = options.maxConcurrency ?? Math.max(1, os.cpus().length - 1);

  const files = await listSourceFiles(root, includeExtensions, excludeDirs);

  const errors: ReactCompilerReport["errors"] = [];
  const results = await mapWithConcurrency(files, maxConcurrency, async (filePath) => {
    try {
      const sourceCode = await fs.readFile(filePath, "utf8");
      const { successfulCompilations, failedCompilations } = checkReactCompiler(
        sourceCode,
        filePath,
        root,
        options.babelPluginPath
      );
      return {
        path: path.relative(root, filePath),
        success: successfulCompilations,
        failed: failedCompilations,
      };
    } catch (error: any) {
      errors.push({
        path: path.relative(root, filePath),
        message: error?.message ?? "Unknown error",
      });
    }
  });

  const filesWithResults = results.filter(
    (result): result is NonNullable<typeof result> =>
      !!result && (result.success.length > 0 || result.failed.length > 0)
  );

  const totals = filesWithResults.reduce(
    (acc, result) => {
      acc.successCount += result.success.length;
      acc.failedCount += result.failed.length;
      if (result.success.length > 0) {
        acc.compiledFiles += 1;
      }
      if (result.failed.length > 0) {
        acc.failedFiles += 1;
      }
      return acc;
    },
    { successCount: 0, failedCount: 0, compiledFiles: 0, failedFiles: 0 }
  );

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      filesScanned: files.length,
      filesWithResults: filesWithResults.length,
      compiledFiles: totals.compiledFiles,
      failedFiles: totals.failedFiles,
      successCount: totals.successCount,
      failedCount: totals.failedCount,
    },
    files: filesWithResults,
    errors,
  };
}
