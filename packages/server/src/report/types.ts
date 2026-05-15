import type { ReactCompilerReport } from "./generate";

export interface NormalizedEntry {
  fnName: string | undefined;
  kind: "success" | "failure" | "skip";
  reason: string;
  description: string;
  line: number | undefined;
  column: number | undefined;
}

export interface TreeNode {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: TreeNode[];
  successCount: number;
  failedCount: number;
  skippedCount: number;
  entries?: NormalizedEntry[];
}

export interface ReportTreeData {
  generatedAt: string;
  root: TreeNode;
  totals: ReactCompilerReport["totals"];
  errors: ReactCompilerReport["errors"];
}

export interface FilterState {
  statusFilter: "all" | "compiled" | "failed" | "skipped";
  searchQuery: string;
  errorTypeFilter: string;
}

export interface EmojiConfig {
  success: string;
  error: string;
  skipped: string;
}

export type WebviewMessage =
  | { type: "openFile"; path: string; line?: number; column?: number }
  | { type: "fixWithAI"; markdown: string };
