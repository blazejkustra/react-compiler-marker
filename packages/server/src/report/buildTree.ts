import type { ReactCompilerReport } from "./generate";
import type { TreeNode, ReportTreeData } from "./types";

export function buildReportTree(report: ReactCompilerReport): ReportTreeData {
  const root: TreeNode = {
    name: "root",
    path: "",
    type: "folder",
    children: [],
    successCount: 0,
    failedCount: 0,
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
        };
        current.children.push(child);
      }

      if (isFile) {
        child.successCount = file.success.length;
        child.failedCount = file.failed.length;
        child.success = file.success;
        child.failed = file.failed;
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

  for (const child of node.children) {
    aggregateCounts(child);
    node.successCount += child.successCount;
    node.failedCount += child.failedCount;
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
