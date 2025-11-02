import { transformFromAstSync } from "@babel/core";
import * as BabelParser from "@babel/parser";
import * as path from "path";
import * as vscode from "vscode";
import { getThrottledFunction } from "./utils";
import { logError } from "./logger";

type EventLocation = {
  start: { line: number; column: number; index: number };
  end: { line: number; column: number; index: number };
};

export type LoggerEvent = {
  filename: string | null;
  kind?: string;
  fnLoc: EventLocation;
  fnName?: string;
  detail?: { reason: string; suggestions: string[]; loc: EventLocation };
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

function runBabelPluginReactCompiler(
  BabelPluginReactCompiler: any,
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
    noEmit: true,
    compilationMode: "infer",
    panicThreshold: "critical_errors",
    environment: {
      enableTreatRefLikeIdentifiersAsRefs: true,
    },
    logger,
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

export function checkReactCompiler(sourceCode: string, filename: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      "No workspace folder is open. Please open a project first."
    );
    return { successfulCompilations: [], failedCompilations: [] };
  }

  let BabelPluginReactCompiler: any;

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
      return { successfulCompilations: [], failedCompilations: [] };
    }
  }

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
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error(
      "No workspace folder is open. Please open a project first."
    );
  }

  let BabelPluginReactCompiler: any;

  try {
    const workspacePath = workspaceFolder.uri.fsPath;
    const nodeModulesPath = path.join(workspacePath, "node_modules");
    BabelPluginReactCompiler = require(path.join(
      nodeModulesPath,
      "babel-plugin-react-compiler"
    ));
  } catch (error: any) {
    failToLoadBabelPluginError(error);
    try {
      BabelPluginReactCompiler = require("babel-plugin-react-compiler");
    } catch (e: any) {
      throw new Error(
        `Failed to load babel-plugin-react-compiler: ${e?.message}`
      );
    }
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
      plugins: [
        [
          BabelPluginReactCompiler,
          {
            noEmit: false,
            compilationMode: "infer",
            panicThreshold: "critical_errors",
            environment: { enableTreatRefLikeIdentifiersAsRefs: true },
          },
        ],
      ],
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
