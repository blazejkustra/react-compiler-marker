import type { ReactCompilerReport } from "./generate";
import { parseLog } from "../parseLog";
import type { TreeNode, NormalizedEntry, ReportTreeData } from "./types";

export function buildReportTree(report: ReactCompilerReport): ReportTreeData {
  const root: TreeNode = {
    name: "root",
    path: "",
    type: "folder",
    children: [],
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
  };

  for (const file of report.files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
          successCount: 0,
          failedCount: 0,
          skippedCount: 0,
        };
        current.children.push(child);
      }

      if (isFile) {
        const toEntry = (
          event: (typeof file.success)[number],
          kind: NormalizedEntry["kind"]
        ): NormalizedEntry => {
          const parsed = parseLog(event);
          return {
            fnName: parsed.fnName,
            kind,
            reason: parsed.reason,
            description: parsed.description,
            line: parsed.startLine + 1, // parseLog returns 0-indexed, normalize back to 1-indexed
            column: parsed.startChar,
          };
        };
        const skipped = file.skipped ?? [];
        const entries: NormalizedEntry[] = [
          ...file.success.map((event) => toEntry(event, "success")),
          ...file.failed.map((event) => toEntry(event, "failure")),
          ...skipped.map((event) => toEntry(event, "skip")),
        ];
        child.entries = entries;
        child.successCount = entries.filter((e) => e.kind === "success").length;
        child.failedCount = entries.filter((e) => e.kind === "failure").length;
        child.skippedCount = entries.filter((e) => e.kind === "skip").length;
      }

      current = child;
    }
  }

  // Aggregate counts up through parents and sort
  aggregateCounts(root);
  sortTree(root);

  return {
    generatedAt: report.generatedAt,
    root,
    totals: report.totals,
    errors: report.errors,
  };
}

function aggregateCounts(node: TreeNode): void {
  if (!node.children) {
    return;
  }

  node.successCount = 0;
  node.failedCount = 0;
  node.skippedCount = 0;

  for (const child of node.children) {
    aggregateCounts(child);
    node.successCount += child.successCount;
    node.failedCount += child.failedCount;
    node.skippedCount += child.skippedCount;
  }
}

function sortTree(node: TreeNode): void {
  if (!node.children) {
    return;
  }

  node.children.sort((a, b) => {
    // Folders first
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  for (const child of node.children) {
    sortTree(child);
  }
}
