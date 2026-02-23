import type { LoggerEvent } from "./checkReactCompiler";

export interface ParsedLog {
  startLine: number;
  endLine: number;
  startChar: number;
  endChar: number;
  reason: string;
  description: string;
  fnName: string | undefined;
}

export function parseLog(log: LoggerEvent): ParsedLog {
  // Helper function to get a value from multiple possible nested paths
  const getLocValue = (
    property: "start" | "end",
    field: "line" | "column",
    defaultValue: number
  ) => {
    return (
      log.detail?.options?.details?.at(0)?.loc?.[property]?.[field] ??
      log.detail?.options?.loc?.[property]?.[field] ??
      log.detail?.loc?.[property]?.[field] ??
      defaultValue
    );
  };

  const startLine = getLocValue("start", "line", 1);
  const endLine = getLocValue("end", "line", 1);
  const startChar = getLocValue("start", "column", 0);
  const endChar = getLocValue("end", "column", 0);

  const reason = log?.detail?.options?.reason || "Unknown reason";
  const description = log?.detail?.options?.description || "";

  return {
    startLine: Math.max(0, startLine - 1),
    endLine: Math.max(0, endLine - 1),
    startChar: Math.max(0, startChar),
    endChar: Math.max(0, endChar),
    reason,
    description,
    fnName: log.fnName,
  };
}
