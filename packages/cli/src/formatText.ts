import type { ReactCompilerReport } from "@react-compiler-marker/server/src/report";

type LogEntry = ReactCompilerReport["files"][number]["failed"][number];

interface ParsedFailure {
  filePath: string;
  fnName: string | undefined;
  reason: string;
  line: number | undefined;
}

function parseFailure(filePath: string, log: LogEntry): ParsedFailure {
  const line =
    log.detail?.options?.details?.at(0)?.loc?.start?.line ??
    log.detail?.options?.loc?.start?.line ??
    log.detail?.loc?.start?.line ??
    log.loc?.start?.line ??
    log.fnLoc?.start?.line ??
    undefined;
  const reason = log?.detail?.options?.reason || log?.reason || "Unknown reason";
  return { filePath, fnName: log.fnName, reason, line };
}

export function formatText(report: ReactCompilerReport): string {
  const lines: string[] = [];
  const { totals } = report;

  lines.push("React Compiler Report");
  lines.push("========================================");
  lines.push(`Files scanned:      ${totals.filesScanned}`);
  lines.push(`Files with results: ${totals.filesWithResults}`);
  lines.push(`Compiled (success): ${totals.successCount}`);
  lines.push(`Failed:             ${totals.failedCount}`);
  lines.push(`Skipped:            ${totals.skippedCount}`);

  if (report.errors.length > 0) {
    lines.push("");
    lines.push("Errors:");
    lines.push("----------------------------------------");
    for (const error of report.errors) {
      lines.push(`  ${error.path}: ${error.message}`);
    }
  }

  const failures: ParsedFailure[] = [];
  for (const file of report.files) {
    for (const log of file.failed) {
      failures.push(parseFailure(file.path, log));
    }
  }

  if (failures.length > 0) {
    lines.push("");
    lines.push("Failures:");
    lines.push("----------------------------------------");
    for (const f of failures) {
      const loc = f.line ? `:${f.line}` : "";
      const name = f.fnName ?? "(anonymous)";
      lines.push(`  ${f.filePath}${loc} - ${name}: ${f.reason}`);
    }
  }

  const skips: ParsedFailure[] = [];
  for (const file of report.files) {
    for (const log of file.skipped ?? []) {
      skips.push(parseFailure(file.path, log));
    }
  }

  if (skips.length > 0) {
    lines.push("");
    lines.push("Skipped components:");
    lines.push("----------------------------------------");
    for (const s of skips) {
      const loc = s.line ? `:${s.line}` : "";
      const name = s.fnName ?? "(anonymous)";
      lines.push(`  ${s.filePath}${loc} - ${name}: ${s.reason}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
