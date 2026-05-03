import fs from "fs/promises";
import type { Dirent } from "fs";
import os from "os";
import path from "path";
import ignore, { type Ignore } from "ignore";
import {
  checkReactCompiler,
  LoggerEvent,
  type CompilationMode,
  DEFAULT_COMPILATION_MODE,
} from "../checkReactCompiler";

/**
 * Full report generated from scanning a project with the React Compiler.
 */
export interface ReactCompilerReport {
  generatedAt: string;
  totals: {
    filesScanned: number;
    filesWithResults: number;
    compiledFiles: number;
    failedFiles: number;
    skippedFiles: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
  };
  files: Array<{
    path: string;
    success: LoggerEvent[];
    failed: LoggerEvent[];
    skipped: LoggerEvent[];
  }>;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Options for scanning a project and producing a report.
 */
export interface ReportOptions {
  /** Absolute or workspace-relative root directory to scan. */
  root: string;
  /** Path to the babel-plugin-react-compiler entry. */
  babelPluginPath: string;
  /** React Compiler `compilationMode` (default: "infer"). */
  compilationMode?: CompilationMode;
  /** Maximum number of files processed in parallel. */
  maxConcurrency?: number;
  /** File extensions to include (e.g. [".js", ".tsx"]). */
  includeExtensions?: string[];
  /** Directory names to skip at any depth (e.g. ["node_modules"]). */
  excludeDirs?: string[];
  /** Whether to respect .gitignore rules when scanning (default: true). */
  respectGitignore?: boolean;
  /** Optional progress callback for reporting processed file counts. */
  onProgress?: (progress: ReportProgress) => void;
}

export interface ReportProgress {
  processed: number;
  total: number;
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
  ".vscode-test",
]);

/**
 * Check if a file path matches one of the configured source extensions.
 */
function isSourceFile(filePath: string, includeExtensions: Set<string>): boolean {
  return includeExtensions.has(path.extname(filePath).toLowerCase());
}

/**
 * Check if a directory name should be excluded from traversal.
 */
function shouldSkipDir(dirName: string, excludeDirs: Set<string>): boolean {
  return excludeDirs.has(dirName);
}

/**
 * Read .gitignore patterns from a directory, returning an empty array if none exists.
 */
async function loadGitignorePatterns(dir: string): Promise<string[]> {
  try {
    const content = await fs.readFile(path.join(dir, ".gitignore"), "utf8");
    return content.split("\n");
  } catch {
    return [];
  }
}

/**
 * Recursively list source files under a root, honoring extension, exclude, and .gitignore filters.
 */
async function listSourceFiles(
  root: string,
  includeExtensions: Set<string>,
  excludeDirs: Set<string>,
  respectGitignore: boolean
): Promise<string[]> {
  const files: string[] = [];
  const queue: string[] = [root];

  let ig: Ignore | undefined;
  if (respectGitignore) {
    ig = ignore();
    const rootPatterns = await loadGitignorePatterns(root);
    if (rootPatterns.length > 0) {
      ig.add(rootPatterns);
    }
  }

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    // Load nested .gitignore rules
    if (ig && current !== root) {
      const nestedPatterns = await loadGitignorePatterns(current);
      if (nestedPatterns.length > 0) {
        const relDir = path.relative(root, current);
        ig.add(nestedPatterns.map((p) => (p.trim() ? path.posix.join(relDir, p) : p)));
      }
    }

    let entries: Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(root, fullPath).split(path.sep).join("/");

      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name, excludeDirs)) {
          continue;
        }
        // For directories, ignore expects a trailing slash
        if (ig && ig.ignores(relativePath + "/")) {
          continue;
        }
        queue.push(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (ig && ig.ignores(relativePath)) {
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
  // Simple worker pool with bounded parallelism.
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

/**
 * Generate a report for all React Compiler results under a root directory.
 */
export async function generateReport(options: ReportOptions): Promise<ReactCompilerReport> {
  const root = path.resolve(options.root);
  const includeExtensions = new Set(options.includeExtensions ?? Array.from(DEFAULT_EXTENSIONS));
  const excludeDirs = new Set(options.excludeDirs ?? Array.from(DEFAULT_EXCLUDES));
  const maxConcurrency = options.maxConcurrency ?? Math.max(1, os.cpus().length - 1);
  const respectGitignore = options.respectGitignore ?? true;
  const compilationMode = options.compilationMode ?? DEFAULT_COMPILATION_MODE;

  const files = await listSourceFiles(root, includeExtensions, excludeDirs, respectGitignore);
  const totalFiles = files.length;
  let processed = 0;
  let lastProgressAt = 0;
  const reportProgress = () => {
    if (!options.onProgress) {
      return;
    }
    const now = Date.now();
    if (processed === totalFiles || now - lastProgressAt >= 100) {
      options.onProgress({ processed, total: totalFiles });
      lastProgressAt = now;
    }
  };

  reportProgress();

  const errors: ReactCompilerReport["errors"] = [];
  const results = await mapWithConcurrency(files, maxConcurrency, async (filePath) => {
    try {
      const sourceCode = await fs.readFile(filePath, "utf8");
      const { successfulCompilations, failedCompilations, skippedCompilations } =
        checkReactCompiler(sourceCode, filePath, root, options.babelPluginPath, compilationMode);
      return {
        path: path.relative(root, filePath),
        success: successfulCompilations,
        failed: failedCompilations,
        skipped: skippedCompilations,
      };
    } catch (error: any) {
      errors.push({
        path: path.relative(root, filePath),
        message: error?.message ?? "Unknown error",
      });
    } finally {
      processed += 1;
      reportProgress();
    }
  });

  const filesWithResults = results.filter(
    (result): result is NonNullable<typeof result> =>
      !!result &&
      (result.success.length > 0 || result.failed.length > 0 || result.skipped.length > 0)
  );

  const totals = filesWithResults.reduce(
    (acc, result) => {
      acc.successCount += result.success.length;
      acc.failedCount += result.failed.length;
      acc.skippedCount += result.skipped.length;
      if (result.success.length > 0) {
        acc.compiledFiles += 1;
      }
      if (result.failed.length > 0) {
        acc.failedFiles += 1;
      }
      if (result.skipped.length > 0) {
        acc.skippedFiles += 1;
      }
      return acc;
    },
    {
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      compiledFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      filesScanned: files.length,
      filesWithResults: filesWithResults.length,
      compiledFiles: totals.compiledFiles,
      failedFiles: totals.failedFiles,
      skippedFiles: totals.skippedFiles,
      successCount: totals.successCount,
      failedCount: totals.failedCount,
      skippedCount: totals.skippedCount,
    },
    files: filesWithResults,
    errors,
  };
}
