import { PluginObj, transformSync } from "@babel/core";
// @ts-expect-error - no types
import BabelPluginSyntaxHermesParser from "babel-plugin-syntax-hermes-parser";
import * as path from "path";
import { LRUCache } from "./cache";

type EventLocation = {
  start?: { line?: number; column?: number; index?: number };
  end?: { line?: number; column?: number; index?: number };
};

type Detail = {
  kind?: string;
  loc?: EventLocation;
  message?: string;
};

type Details = {
  reason?: string;
  description?: string;
  suggestions?: string[];
  loc?: EventLocation;
  details?: Array<Detail>;
};

export type LoggerEvent = {
  filename: string | null;
  kind?: string;
  fnLoc: EventLocation;
  fnName?: string;
  reason?: string;
  loc?: EventLocation;
  detail?: Details & {
    options: Details;
  };
};

export type CompilationMode = "infer" | "annotation" | "syntax" | "all";

export const DEFAULT_COMPILATION_MODE: CompilationMode = "infer";

const VALID_COMPILATION_MODES: ReadonlySet<CompilationMode> = new Set([
  "infer",
  "annotation",
  "syntax",
  "all",
]);

export function normalizeCompilationMode(value: unknown): CompilationMode {
  if (typeof value === "string" && VALID_COMPILATION_MODES.has(value as CompilationMode)) {
    return value as CompilationMode;
  }
  if (value !== undefined && value !== null) {
    throttledError(
      `Invalid compilationMode "${String(value)}". Falling back to "${DEFAULT_COMPILATION_MODE}". Valid values: infer, annotation, syntax, all.`
    );
  }
  return DEFAULT_COMPILATION_MODE;
}

const DEFAULT_COMPILER_OPTIONS = {
  noEmit: false,
  panicThreshold: "none",
  environment: {
    enableTreatRefLikeIdentifiersAsRefs: true,
  },
};

// Only hand parsing to hermes-parser for files with an @flow pragma; everything
// else stays on @babel/parser, which supports syntax hermes-parser lacks (e.g.
// top-level await).
const HERMES_PARSER_OPTIONS = { parseLangTypes: "flow" };

// Cache for the Babel plugin, keyed by the workspace root it was loaded from.
// A multi-root workspace can have a different (or differently versioned)
// babel-plugin-react-compiler per root, so a single cached plugin would make
// every root after the first analyze its files with the wrong compiler.
const pluginCache = new Map<string, PluginObj>();

export function clearPluginCache(): void {
  pluginCache.clear();
}

// Compilation result cache (50 entries max)
interface CompilationResult {
  successfulCompilations: Array<LoggerEvent>;
  failedCompilations: Array<LoggerEvent>;
  skippedCompilations: Array<LoggerEvent>;
}

const compilationCache = new LRUCache<CompilationResult>(100);

export function clearCompilationCache(): void {
  compilationCache.clear();
}

let lastErrorTime = 0;
const ERROR_THROTTLE_MS = 1000 * 60 * 5; // 5 minutes

function throttledError(message: string): void {
  const now = Date.now();
  if (now - lastErrorTime >= ERROR_THROTTLE_MS) {
    console.error(`[${new Date().toISOString()}] SERVER ERROR: ${message}`);
    lastErrorTime = now;
  }
}

function runBabelPluginReactCompiler(
  BabelPluginReactCompiler: PluginObj | undefined,
  text: string,
  file: string,
  language: "flow" | "typescript",
  compilationMode: CompilationMode
) {
  const successfulCompilations: Array<LoggerEvent> = [];
  const failedCompilations: Array<LoggerEvent> = [];
  const skippedCompilations: Array<LoggerEvent> = [];

  const logger = {
    logEvent(filename: string | null, rawEvent: LoggerEvent) {
      const event = { ...rawEvent, filename };
      switch (event.kind) {
        case "CompileSuccess": {
          successfulCompilations.push(event);
          return;
        }
        case "CompileError":
        case "CompileDiagnostic":
        case "PipelineError":
          failedCompilations.push(event);
          return;
        case "CompileSkip":
          skippedCompilations.push(event);
          return;
      }
    },
  };

  const COMPILER_OPTIONS = {
    ...DEFAULT_COMPILER_OPTIONS,
    compilationMode,
    logger,
    noEmit: true,
  };

  const result = transformSync(text, {
    filename: file,
    highlightCode: false,
    retainLines: true,
    plugins: [
      [BabelPluginSyntaxHermesParser, HERMES_PARSER_OPTIONS],
      [BabelPluginReactCompiler, COMPILER_OPTIONS],
    ],
    parserOpts: {
      plugins: language === "typescript" ? ["typescript", "jsx"] : ["flow", "jsx"],
    },
    sourceType: "module",
    configFile: false,
    babelrc: false,
  });

  // eslint-disable-next-line eqeqeq
  if (result?.code == null) {
    throw new Error(`Expected BabelPluginReactForget to codegen successfully, got: ${result}`);
  }

  return {
    successfulCompilations,
    failedCompilations,
    skippedCompilations,
  };
}

const BUNDLED_PLUGIN_CACHE_KEY = "\0bundled";

function importBabelPluginReactCompiler(
  workspaceFolder: string | undefined,
  babelPluginPath: string
): PluginObj | undefined {
  const cacheKey = workspaceFolder
    ? `${workspaceFolder}\0${babelPluginPath}`
    : BUNDLED_PLUGIN_CACHE_KEY;

  // Return the plugin cached for this workspace root, if any
  const cached = pluginCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (workspaceFolder) {
    try {
      const plugin: PluginObj = require(path.join(workspaceFolder, babelPluginPath));
      pluginCache.set(cacheKey, plugin);
      return plugin;
    } catch (error: any) {
      throttledError(
        `Failed to load babel-plugin-react-compiler from ${workspaceFolder}: ${error?.message}`
      );
    }
  }

  // Fallback to the bundled version. Cache it under the root's key too, so a
  // root without a local plugin does not retry the failing require() for every
  // file it scans.
  const bundled = pluginCache.get(BUNDLED_PLUGIN_CACHE_KEY) ?? loadBundledPlugin();
  if (bundled) {
    pluginCache.set(cacheKey, bundled);
  }
  return bundled;
}

function loadBundledPlugin(): PluginObj | undefined {
  try {
    const plugin: PluginObj = require("babel-plugin-react-compiler");
    pluginCache.set(BUNDLED_PLUGIN_CACHE_KEY, plugin);
    return plugin;
  } catch (error: any) {
    throttledError(`Failed to load babel-plugin-react-compiler: ${error?.message}`);
    return undefined;
  }
}

function getLanguageFromFilename(filename: string): "flow" | "typescript" {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ["js", "jsx", "mjs"].includes(ext ?? "") ? "flow" : "typescript";
}

export function checkReactCompiler(
  sourceCode: string,
  filename: string,
  workspaceFolder: string | undefined,
  babelPluginPath: string,
  compilationMode: CompilationMode
): CompilationResult {
  // Check cache first (keyed by content, filename and compilation mode)
  const cached = compilationCache.get(sourceCode, filename, compilationMode);
  if (cached) {
    return cached;
  }

  const BabelPluginReactCompiler = importBabelPluginReactCompiler(workspaceFolder, babelPluginPath);

  if (!BabelPluginReactCompiler) {
    return { successfulCompilations: [], failedCompilations: [], skippedCompilations: [] };
  }

  try {
    const language = getLanguageFromFilename(filename);
    const result = runBabelPluginReactCompiler(
      BabelPluginReactCompiler,
      sourceCode,
      filename,
      language,
      compilationMode
    );

    // Cache the result
    compilationCache.set(sourceCode, filename, compilationMode, result);

    return result;
  } catch (error: any) {
    throttledError(`Failed to compile the file. Please check the file content. ${error?.message}`);
    const emptyResult: CompilationResult = {
      successfulCompilations: [],
      failedCompilations: [],
      skippedCompilations: [],
    };
    compilationCache.set(sourceCode, filename, compilationMode, emptyResult);
    return emptyResult;
  }
}

export async function getCompiledOutput(
  sourceCode: string,
  filename: string,
  workspaceFolder: string | undefined,
  babelPluginPath: string,
  compilationMode: CompilationMode
): Promise<string> {
  const BabelPluginReactCompiler = importBabelPluginReactCompiler(workspaceFolder, babelPluginPath);

  if (!BabelPluginReactCompiler) {
    throw new Error("babel-plugin-react-compiler is not available");
  }

  try {
    const language = getLanguageFromFilename(filename);
    const result = transformSync(sourceCode, {
      filename,
      highlightCode: false,
      retainLines: true,
      plugins: [
        [BabelPluginSyntaxHermesParser, HERMES_PARSER_OPTIONS],
        [BabelPluginReactCompiler, { ...DEFAULT_COMPILER_OPTIONS, compilationMode }],
      ],
      parserOpts: {
        plugins: language === "typescript" ? ["typescript", "jsx"] : ["flow", "jsx"],
      },
      sourceType: "module",
      configFile: false,
      babelrc: false,
    });

    // eslint-disable-next-line eqeqeq
    if (result?.code == null) {
      throw new Error("Compilation produced no output");
    }
    return result.code;
  } catch (error: any) {
    throw new Error(`Failed to compile the file. Please check the file content. ${error?.message}`);
  }
}
