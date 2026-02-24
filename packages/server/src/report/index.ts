export {
  generateReport,
  type ReactCompilerReport,
  type ReportOptions,
  type ReportProgress,
} from "./generate";
export { buildReportTree } from "./buildTree";
export { getReportHtml, type ReportHtmlOptions } from "./webviewContent";
export type {
  TreeNode,
  NormalizedEntry,
  ReportTreeData,
  FilterState,
  EmojiConfig,
  WebviewMessage,
} from "./types";
