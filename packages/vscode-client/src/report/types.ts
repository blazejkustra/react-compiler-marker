import type { ReactCompilerReport } from "@react-compiler-marker/server/src/report";

export interface TreeNode {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: TreeNode[];
  successCount: number;
  failedCount: number;
  success?: ReactCompilerReport["files"][number]["success"];
  failed?: ReactCompilerReport["files"][number]["failed"];
}

export interface ReportTreeData {
  generatedAt: string;
  root: TreeNode;
  totals: ReactCompilerReport["totals"];
  errors: ReactCompilerReport["errors"];
}

export interface FilterState {
  statusFilter: "all" | "compiled" | "failed";
  searchQuery: string;
  errorTypeFilter: string;
}

export interface EmojiConfig {
  success: string;
  error: string;
}

export type WebviewMessage =
  | { type: "openFile"; path: string; line?: number; column?: number }
  | { type: "requestData" };

export type ExtensionMessage = { type: "reportData"; data: ReportTreeData };
