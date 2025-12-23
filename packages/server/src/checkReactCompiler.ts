import { PluginObj, transformFromAstSync } from "@babel/core";
import * as BabelParser from "@babel/parser";
import * as path from "path";

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
  detail?: Details & {
    options: Details;
  };
};

const DEFAULT_COMPILER_OPTIONS = {
  noEmit: false,
  compilationMode: "infer",
  panicThreshold: "none",
  environment: {
    enableTreatRefLikeIdentifiersAsRefs: true,
  },
};

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
  language: "flow" | "typescript"
) {
  const successfulCompilations: Array<LoggerEvent> = [];
  const failedCompilations: Array<LoggerEvent> = [];

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
      }
    },
  };

  const COMPILER_OPTIONS = {
    ...DEFAULT_COMPILER_OPTIONS,
    logger,
    noEmit: true,
  };

  const ast = BabelParser.parse(text, {
    sourceFilename: file,
    plugins: [language, "jsx"],
    sourceType: "module",
  });
  const result = transformFromAstSync(ast, text, {
    filename: file,
    highlightCode: false,
    retainLines: true,
    plugins: [[BabelPluginReactCompiler, COMPILER_OPTIONS]],
    sourceType: "module",
    configFile: false,
    babelrc: false,
  });

  // eslint-disable-next-line eqeqeq
  if (result?.code == null) {
    throw new Error(
      `Expected BabelPluginReactForget to codegen successfully, got: ${result}`
    );
  }

  return {
    successfulCompilations,
    failedCompilations,
  };
}

function importBabelPluginReactCompiler(
  workspaceFolder: string | undefined,
  babelPluginPath: string
): PluginObj | undefined {
  let BabelPluginReactCompiler: PluginObj | undefined;

  if (workspaceFolder) {
    try {
      BabelPluginReactCompiler = require(path.join(
        workspaceFolder,
        babelPluginPath
      ));
      return BabelPluginReactCompiler;
    } catch (error: any) {
      throttledError(
        `Failed to load babel-plugin-react-compiler from workspace: ${error?.message}`
      );
    }
  }

  // Fallback to bundled version
  try {
    BabelPluginReactCompiler = require("babel-plugin-react-compiler");
  } catch (error: any) {
    throttledError(
      `Failed to load babel-plugin-react-compiler: ${error?.message}`
    );
    return undefined;
  }

  return BabelPluginReactCompiler;
}

export function checkReactCompiler(
  sourceCode: string,
  filename: string,
  workspaceFolder: string | undefined,
  babelPluginPath: string
) {
  const BabelPluginReactCompiler = importBabelPluginReactCompiler(
    workspaceFolder,
    babelPluginPath
  );

  if (!BabelPluginReactCompiler) {
    return { successfulCompilations: [], failedCompilations: [] };
  }

  try {
    return runBabelPluginReactCompiler(
      BabelPluginReactCompiler,
      sourceCode,
      filename,
      "typescript"
    );
  } catch (error: any) {
    throttledError(
      `Failed to compile the file. Please check the file content. ${error?.message}`
    );
    return { successfulCompilations: [], failedCompilations: [] };
  }
}

export async function getCompiledOutput(
  sourceCode: string,
  filename: string,
  workspaceFolder: string | undefined,
  babelPluginPath: string
): Promise<string> {
  const BabelPluginReactCompiler = importBabelPluginReactCompiler(
    workspaceFolder,
    babelPluginPath
  );

  if (!BabelPluginReactCompiler) {
    throw new Error("babel-plugin-react-compiler is not available");
  }

  try {
    const ast = BabelParser.parse(sourceCode, {
      sourceFilename: filename,
      plugins: ["typescript", "jsx"],
      sourceType: "module",
    });
    const result = transformFromAstSync(ast, sourceCode, {
      filename,
      highlightCode: false,
      retainLines: true,
      plugins: [[BabelPluginReactCompiler, DEFAULT_COMPILER_OPTIONS]],
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
    throw new Error(
      `Failed to compile the file. Please check the file content. ${error?.message}`
    );
  }
}
