import * as vscode from "vscode";
import type { ReportTreeData, EmojiConfig, WebviewMessage } from "@react-compiler-marker/server/src/report";
import { getReportHtml } from "@react-compiler-marker/server/src/report";

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
    workspaceUri: vscode.Uri,
    data: ReportTreeData,
    emojis: EmojiConfig
  ) {
    this.panel = panel;
    this.data = data;
    this.workspaceUri = workspaceUri;
    this.emojis = emojis;

    this.panel.webview.html = this.getHtml();
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
      ReportPanel.instance.panel.webview.html = ReportPanel.instance.getHtml();
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

    ReportPanel.instance = new ReportPanel(panel, workspaceUri, data, emojis);
  }

  private getHtml(): string {
    const nonce = getNonce();
    const cspSource = this.panel.webview.cspSource;

    const headExtra = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
    <style nonce="${nonce}">
      :root {
        --rcm-bg: var(--vscode-editor-background);
        --rcm-foreground: var(--vscode-foreground);
        --rcm-border: var(--vscode-widget-border, var(--vscode-panel-border));
        --rcm-input-bg: var(--vscode-input-background);
        --rcm-input-fg: var(--vscode-input-foreground);
        --rcm-input-border: var(--vscode-input-border, transparent);
        --rcm-input-placeholder: var(--vscode-input-placeholderForeground);
        --rcm-button-bg: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
        --rcm-button-fg: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
        --rcm-button-hover-bg: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-hoverBackground));
        --rcm-list-hover-bg: var(--vscode-list-hoverBackground);
        --rcm-success: var(--vscode-testing-iconPassed, #4caf50);
        --rcm-failed: var(--vscode-testing-iconFailed, #f44336);
        --rcm-font-family: var(--vscode-font-family);
        --rcm-font-size: var(--vscode-font-size);
        --rcm-editor-font-family: var(--vscode-editor-font-family, monospace);
        --rcm-editor-font-size: var(--vscode-editor-font-size, 13px);
      }
    </style>`;

    const scriptExtra = `window.ideBridge = (function() {
      var vscode = acquireVsCodeApi();
      return {
        postMessage: function(msg) { vscode.postMessage(msg); },
        getState: function() { return vscode.getState() || {}; },
        setState: function(s) { vscode.setState(s); }
      };
    })();`;

    return getReportHtml({
      data: this.data,
      emojis: this.emojis,
      headExtra,
      scriptExtra,
    });
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
      case "requestData":
        break;
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
