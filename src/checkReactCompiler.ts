import { transformFromAstSync } from "@babel/core";
import * as BabelParser from "@babel/parser";
import * as path from "path";
import * as vscode from "vscode";

export type LoggerEvent = {
  filename: string | null;
  kind?: string;
  fnLoc: { start: { line: number; column: number; index: number } };
  fnName?: string;
};

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
    const nodeModulesPath = path.join(workspacePath, "node_modules");
    BabelPluginReactCompiler = require(path.join(
      nodeModulesPath,
      "babel-plugin-react-compiler"
    ));
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to load react-compiler-healthcheck. Make sure it is installed in the workspace. Error: ${error.message}`
    );
    return { successfulCompilations: [], failedCompilations: [] };
  }

  try {
    return runBabelPluginReactCompiler(
      BabelPluginReactCompiler,
      sourceCode,
      filename,
      "typescript"
    );
  } catch {
    return { successfulCompilations: [], failedCompilations: [] };
  }
}
