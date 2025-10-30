import * as vscode from "vscode";

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private componentCount: number = 0;
  private isScanned: boolean = false;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "react-compiler-marker.statusBarClick";
    this.updateDisplay();
  }

  public show(): void {
    const config = vscode.workspace.getConfiguration("reactCompilerMarker");
    const showStatusBar = config.get<boolean>("showStatusBar", true);

    if (showStatusBar) {
      this.statusBarItem.show();
    }
  }

  public hide(): void {
    this.statusBarItem.hide();
  }

  public updateAfterScan(count: number): void {
    this.componentCount = count;
    this.isScanned = true;
    this.updateDisplay();
  }

  public reset(): void {
    this.componentCount = 0;
    this.isScanned = false;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.isScanned) {
      this.statusBarItem.text = "$(sparkle) React Compiler";
      this.statusBarItem.tooltip = "Click to scan workspace for unoptimized components";
    } else if (this.componentCount === 0) {
      this.statusBarItem.text = "$(sparkle) All optimized";
      this.statusBarItem.tooltip = "All components are optimized by React Compiler";
    } else {
      this.statusBarItem.text = `$(sparkle) ${this.componentCount} unoptimized`;
      this.statusBarItem.tooltip = `Found ${this.componentCount} unoptimized component${
        this.componentCount === 1 ? "" : "s"
      }. Click to view report.`;
    }
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
