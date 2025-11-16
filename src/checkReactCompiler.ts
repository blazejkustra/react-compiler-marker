import { PluginObj, transformFromAstSync } from "@babel/core";
import * as BabelParser from "@babel/parser";
import * as path from "path";
import * as vscode from "vscode";
import { getThrottledFunction } from "./utils";
import { logError } from "./logger";

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

const failToCompileError = getThrottledFunction(
  (error) =>
    logError(
      `Failed to compile the file. Please check the file content. ${error?.message}`
    ),
  1000 * 60 * 5 // 5 minutes
);

const failToLoadBabelPluginError = getThrottledFunction(
  (error) =>
    logError(
      `Failed to load babel-plugin-react-compiler. Make sure it is installed in your workspace (defaults to the compiler bundled with this extension). Error: ${error?.message}`
    ),
  1000 * 60 * 5 // 5 minutes
);

const DEFAULT_COMPILER_OPTIONS = {
  noEmit: false,
  compilationMode: "infer",
  panicThreshold: "none",
  environment: {
    enableTreatRefLikeIdentifiersAsRefs: true,
  },
};

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

function importBabelPluginReactCompiler(): PluginObj | undefined {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      "No workspace folder is open. Please open a project first."
    );
    return;
  }

  let BabelPluginReactCompiler: PluginObj | undefined;

  try {
    const workspacePath = workspaceFolder.uri.fsPath;
    const config = vscode.workspace.getConfiguration("reactCompilerMarker");
    const babelPluginPath = config.get<string>(
      "babelPluginPath",
      "node_modules/babel-plugin-react-compiler"
    );

    BabelPluginReactCompiler = require(path.join(
      workspacePath,
      babelPluginPath
    ));
  } catch (error: any) {
    failToLoadBabelPluginError(error);
    try {
      BabelPluginReactCompiler = require("babel-plugin-react-compiler");
    } catch (error: any) {
      console.error(error);
      return;
    }
  }

  return BabelPluginReactCompiler;
}

export function checkReactCompiler(sourceCode: string, filename: string) {
  const BabelPluginReactCompiler = importBabelPluginReactCompiler();

  try {
    return runBabelPluginReactCompiler(
      BabelPluginReactCompiler,
      sourceCode,
      filename,
      "typescript"
    );
  } catch (error: any) {
    failToCompileError(error);
    return { successfulCompilations: [], failedCompilations: [] };
  }
}

export async function getCompiledOutput(
  sourceCode: string,
  filename: string
): Promise<string> {
  const BabelPluginReactCompiler = importBabelPluginReactCompiler();

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
    failToCompileError(error);
    throw new Error(
      `Failed to compile the file. Please check the file content. ${error?.message}`
    );
  }
}
