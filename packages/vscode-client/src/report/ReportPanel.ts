import * as vscode from "vscode";
import type { ReportTreeData, EmojiConfig, WebviewMessage, ExtensionMessage } from "./types";
import { getWebviewHtml } from "./webviewContent";

export class ReportPanel {
  public static readonly viewType = "reactCompilerMarkerReport";
  private static instance: ReportPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private data: ReportTreeData;
  private readonly workspaceUri: vscode.Uri;
  private readonly emojis: EmojiConfig;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    workspaceUri: vscode.Uri,
    data: ReportTreeData,
    emojis: EmojiConfig
  ) {
    this.panel = panel;
    this.data = data;
    this.workspaceUri = workspaceUri;
    this.emojis = emojis;

    this.panel.webview.html = this.getHtml(extensionUri);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.handleMessage(message),
      null,
      this.disposables
    );
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    workspaceUri: vscode.Uri,
    data: ReportTreeData,
    emojis: EmojiConfig
  ): void {
    if (ReportPanel.instance) {
      ReportPanel.instance.data = data;
      ReportPanel.instance.panel.webview.html = ReportPanel.instance.getHtml(extensionUri);
      ReportPanel.instance.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ReportPanel.viewType,
      "React Compiler Report",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    ReportPanel.instance = new ReportPanel(panel, extensionUri, workspaceUri, data, emojis);
  }

  private getHtml(extensionUri: vscode.Uri): string {
    const nonce = getNonce();
    const cspSource = this.panel.webview.cspSource;
    return getWebviewHtml(this.data, nonce, cspSource, this.emojis);
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case "openFile": {
        const uri = vscode.Uri.joinPath(this.workspaceUri, message.path);
        try {
          const doc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
          if (message.line !== undefined) {
            const pos = new vscode.Position(message.line, message.column ?? 0);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
          }
        } catch {
          vscode.window.showErrorMessage(`Could not open file: ${message.path}`);
        }
        break;
      }
      case "requestData": {
        const msg: ExtensionMessage = { type: "reportData", data: this.data };
        this.panel.webview.postMessage(msg);
        break;
      }
    }
  }

  private dispose(): void {
    ReportPanel.instance = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
