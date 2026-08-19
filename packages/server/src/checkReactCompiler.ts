import { PluginObj, transformSync } from "@babel/core";
// @ts-expect-error - no types
import BabelPluginSyntaxHermesParser from "babel-plugin-syntax-hermes-parser";
import { createRequire } from "module";
import * as path from "path";
import { LRUCache } from "./cache";
import { createSkipEventRemapper } from "./remapSkipEvents";

export type EventLocation = {
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

// Babel plugins that must run *before* the React Compiler -- macro expanders
// such as @lingui/babel-plugin-lingui-macro. The compiler only ever sees the
// file as-written, so an unexpanded macro can make it bail on syntax the real
// build never emits (a tagged template with interpolations is the common
// case), reporting a component as un-memoized when the bundle memoizes it fine.
let extraBabelPlugins: ReadonlyArray<string> = [];

export function setExtraBabelPlugins(plugins: ReadonlyArray<string>): void {
  extraBabelPlugins = plugins;
}

export function normalizeExtraBabelPlugins(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return value as string[];
  }
  // Some clients encode an empty list as an empty object; that is still "none".
  if (typeof value === "object" && Object.keys(value as object).length === 0) {
    return [];
  }
  throttledError(
    `Invalid extraBabelPlugins "${JSON.stringify(value)}". Expected an array of module specifiers.`
  );
  return [];
}

// Resolved extra plugins, keyed by `${workspaceFolder}\0${specifier}`. `null`
// marks a specifier that failed to load, so we do not retry it per file.
const extraPluginCache = new Map<string, PluginObj | null>();

/**
 * Runs `run` with the process cwd set to `workspaceFolder`.
 *
 * Extra plugins are third-party macro expanders, and several of them (Lingui
 * among others) find their own config by searching up from `process.cwd()` --
 * which, for a language server, is wherever the editor was launched rather
 * than the project being edited. Babel's own `cwd` option does not help: the
 * plugin reads the real process cwd.
 *
 * Safe because the work inside is `transformSync` on a single-threaded
 * runtime -- nothing else can run, and so nothing else can observe the
 * swapped cwd, before it is restored. Only applied when extra plugins are
 * configured, so the default path is untouched.
 */
function withWorkspaceCwd<T>(workspaceFolder: string | undefined, run: () => T): T {
  if (!workspaceFolder || extraBabelPlugins.length === 0) {
    return run();
  }

  const previousCwd = process.cwd();
  if (previousCwd === workspaceFolder) {
    return run();
  }

  process.chdir(workspaceFolder);
  try {
    return run();
  } finally {
    process.chdir(previousCwd);
  }
}

function loadExtraBabelPlugins(workspaceFolder: string | undefined): Array<PluginObj> {
  if (!workspaceFolder || extraBabelPlugins.length === 0) {
    return [];
  }

  const workspaceRequire = createRequire(path.join(workspaceFolder, "package.json"));
  const plugins: Array<PluginObj> = [];

  for (const specifier of extraBabelPlugins) {
    const cacheKey = `${workspaceFolder}\0${specifier}`;
    let plugin = extraPluginCache.get(cacheKey);

    if (plugin === undefined) {
      try {
        // resolve() honours the package's "exports" map; require()-ing the
        // resolved file (rather than the specifier) is what lets ESM-only
        // plugins load, via Node's require(esm) support.
        const loaded = workspaceRequire(workspaceRequire.resolve(specifier));
        plugin = (loaded?.default ?? loaded) as PluginObj;
      } catch (error: any) {
        throttledError(
          `Failed to load extra babel plugin "${specifier}" from ${workspaceFolder}: ${error?.message}`
        );
        plugin = null;
      }
      extraPluginCache.set(cacheKey, plugin);
    }

    if (plugin) {
      plugins.push(plugin);
    }
  }

  return plugins;
}

export function clearPluginCache(): void {
  pluginCache.clear();
  extraPluginCache.clear();
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
  compilationMode: CompilationMode,
  extraPlugins: Array<PluginObj>
) {
  const successfulCompilations: Array<LoggerEvent> = [];
  const failedCompilations: Array<LoggerEvent> = [];
  const skippedCompilations: Array<LoggerEvent> = [];

  const skipRemapper = createSkipEventRemapper();

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
          skippedCompilations.push(skipRemapper.remapSkipEvent(event));
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
      // Macro expanders run first so the compiler sees the same tree the real
      // build compiles. Babel merges every plugin into one traversal and
      // visits a node in plugin order, so an expander with a Program visitor
      // rewrites the tree before the compiler's Program visitor reads it.
      ...extraPlugins,
      skipRemapper.plugin,
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

/**
 * Identifies which compiler a result came from. Both the plugin cache and the
 * compilation cache key on this, so they can never disagree about which root's
 * plugin produced a given result.
 */
function pluginScope(workspaceFolder: string | undefined, babelPluginPath: string): string {
  // The extra plugins change the tree the compiler sees, so results keyed
  // without them would survive a settings change that invalidates them.
  const extras = extraBabelPlugins.join(",");
  return workspaceFolder
    ? `${workspaceFolder}\0${babelPluginPath}\0${extras}`
    : `${BUNDLED_PLUGIN_CACHE_KEY}\0${extras}`;
}

function importBabelPluginReactCompiler(
  workspaceFolder: string | undefined,
  babelPluginPath: string
): PluginObj | undefined {
  const cacheKey = pluginScope(workspaceFolder, babelPluginPath);

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
  // Check cache first (keyed by content, filename, compilation mode and the
  // root/plugin the result would come from)
  const scope = pluginScope(workspaceFolder, babelPluginPath);
  const cached = compilationCache.get(sourceCode, filename, compilationMode, scope);
  if (cached) {
    return cached;
  }

  const BabelPluginReactCompiler = importBabelPluginReactCompiler(workspaceFolder, babelPluginPath);

  if (!BabelPluginReactCompiler) {
    return { successfulCompilations: [], failedCompilations: [], skippedCompilations: [] };
  }

  try {
    const language = getLanguageFromFilename(filename);
    const result = withWorkspaceCwd(workspaceFolder, () =>
      runBabelPluginReactCompiler(
        BabelPluginReactCompiler,
        sourceCode,
        filename,
        language,
        compilationMode,
        loadExtraBabelPlugins(workspaceFolder)
      )
    );

    // Cache the result
    compilationCache.set(sourceCode, filename, compilationMode, scope, result);

    return result;
  } catch (error: any) {
    throttledError(`Failed to compile the file. Please check the file content. ${error?.message}`);
    const emptyResult: CompilationResult = {
      successfulCompilations: [],
      failedCompilations: [],
      skippedCompilations: [],
    };
    compilationCache.set(sourceCode, filename, compilationMode, scope, emptyResult);
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
    const result = withWorkspaceCwd(workspaceFolder, () =>
      transformSync(sourceCode, {
        filename,
        highlightCode: false,
        retainLines: true,
        plugins: [
          [BabelPluginSyntaxHermesParser, HERMES_PARSER_OPTIONS],
          ...loadExtraBabelPlugins(workspaceFolder),
          [BabelPluginReactCompiler, { ...DEFAULT_COMPILER_OPTIONS, compilationMode }],
        ],
        parserOpts: {
          plugins: language === "typescript" ? ["typescript", "jsx"] : ["flow", "jsx"],
        },
        sourceType: "module",
        configFile: false,
        babelrc: false,
      })
    );

    // eslint-disable-next-line eqeqeq
    if (result?.code == null) {
      throw new Error("Compilation produced no output");
    }
    return result.code;
  } catch (error: any) {
    throw new Error(`Failed to compile the file. Please check the file content. ${error?.message}`);
  }
}
