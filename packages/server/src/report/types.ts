import type { ReactCompilerReport } from "./generate";

export interface NormalizedEntry {
  fnName: string | undefined;
  kind: "success" | "failure";
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
  entries?: NormalizedEntry[];
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
  | { type: "fixWithAI"; markdown: string };
