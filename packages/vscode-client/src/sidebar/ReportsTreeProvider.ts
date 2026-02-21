import * as vscode from "vscode";
import type { ReactCompilerReport } from "@react-compiler-marker/server/src/report";

interface ReportMetadata {
  uri: vscode.Uri;
  report: ReactCompilerReport;
}

export class ReportItem extends vscode.TreeItem {
  constructor(
    public readonly reportUri: vscode.Uri,
    public readonly report: ReactCompilerReport
  ) {
    const date = new Date(report.generatedAt);
    const label = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = `\u2728 ${report.totals.successCount}  \uD83D\uDEAB ${report.totals.failedCount}`;
    this.iconPath = new vscode.ThemeIcon("graph");
    this.tooltip = `Files scanned: ${report.totals.filesScanned}\nCompiled: ${report.totals.successCount}\nFailed: ${report.totals.failedCount}`;
    this.contextValue = "reportItem";
    this.command = {
      command: "react-compiler-marker.openReport",
      title: "Open Report",
      arguments: [reportUri],
    };
  }
}

export class ReportsTreeProvider implements vscode.TreeDataProvider<ReportItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ReportItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private reports: ReportMetadata[] = [];

  constructor(private readonly storageUri: vscode.Uri) {}

  async loadReports(): Promise<void> {
    const reportsDir = vscode.Uri.joinPath(this.storageUri, "react-compiler-marker");

    try {
      const entries = await vscode.workspace.fs.readDirectory(reportsDir);
      const reportFiles = entries
        .filter(([name, type]) => type === vscode.FileType.File && name.startsWith("report-") && name.endsWith(".json"))
        .map(([name]) => name);

      const loaded: ReportMetadata[] = [];
      for (const fileName of reportFiles) {
        const uri = vscode.Uri.joinPath(reportsDir, fileName);
        try {
          const content = await vscode.workspace.fs.readFile(uri);
          const report = JSON.parse(Buffer.from(content).toString("utf8")) as ReactCompilerReport;
          loaded.push({ uri, report });
        } catch {
          // Skip malformed report files
        }
      }

      // Sort newest first
      loaded.sort((a, b) => new Date(b.report.generatedAt).getTime() - new Date(a.report.generatedAt).getTime());
      this.reports = loaded;
    } catch {
      // Directory doesn't exist yet — no reports
      this.reports = [];
    }
  }

  async refresh(): Promise<void> {
    await this.loadReports();
    this._onDidChangeTreeData.fire();
  }

  getLatestFailedCount(): number {
    if (this.reports.length === 0) {
      return 0;
    }
    return this.reports[0].report.totals.failedCount;
  }

  async deleteReport(uri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.delete(uri);
    await this.refresh();
  }

  getTreeItem(element: ReportItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ReportItem[] {
    return this.reports.map(({ uri, report }) => new ReportItem(uri, report));
  }
}
