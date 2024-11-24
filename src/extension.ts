// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { detectFunctionComponents } from "./detectFunctionComponent";
import { checkReactCompiler, LoggerEvent } from "./checkReactCompiler";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "react-compiler-marker" is now active!'
  );

  const magicSparksDecoration = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: " ✨",
    },
  });

  const blockIndicatorDecoration = vscode.window.createTextEditorDecorationType(
    {
      after: {
        contentText: " 🚫",
      },
    }
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "react-compiler-marker.helloWorld",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const { successfulCompilations, failedCompilations } =
          checkReactCompiler(
            editor.document.getText(),
            editor.document.fileName
          );

        await updateDecorations(
          editor,
          magicSparksDecoration,
          successfulCompilations
        );

        await updateDecorations(
          editor,
          blockIndicatorDecoration,
          failedCompilations
        );
      }

      vscode.window.showInformationMessage("Hello World3 ✨!");
    }
  );

  context.subscriptions.push(disposable);
}

async function updateDecorations(
  editor: vscode.TextEditor,
  decorationType: vscode.TextEditorDecorationType,
  logs: LoggerEvent[]
) {
  // Create decorations for each detected line
  const decorations: vscode.DecorationOptions[] = logs.map((log) => {
    const range = new vscode.Range(
      log.fnLoc.start.line - 1,
      8,
      log.fnLoc.start.line - 1,
      8
    );
    return { range };
  });

  console.log(`%%% decorations`, JSON.stringify(logs, null, 2));

  editor.setDecorations(decorationType, decorations);

  const fileUri = editor?.document.uri;
  if (fileUri === undefined) {
    return;
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
