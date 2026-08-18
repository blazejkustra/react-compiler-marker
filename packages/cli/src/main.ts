// Suppress Babel's "code generator has deoptimised" warnings on large files
process.env.BABEL_DISABLE_CACHE = "1";
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = ((chunk: any, ...args: any[]) => {
  if (
    typeof chunk === "string" &&
    chunk.includes("[BABEL] Note: The code generator has deoptimised")
  ) {
    return true;
  }
  return originalStderrWrite(chunk, ...args);
}) as typeof process.stderr.write;

import { parseArgs } from "node:util";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { exec } from "node:child_process";
import {
  generateReport,
  buildReportTree,
  getReportHtml,
  type ReactCompilerReport,
} from "@react-compiler-marker/server/src/report";
import { formatText } from "./formatText";

const VERSION = "1.0.0";

const HELP = `
Usage: react-compiler-marker [options] [directory]

Generate a React Compiler report for a project.

Arguments:
  directory                    Root directory to scan (default: current directory)

Options:
  --format <format>            Output format: text, html, json (default: text)
  --output <path>              Write output to a file instead of stdout
  --exclude-dirs <dirs>        Comma-separated directories to exclude
  --include-extensions <exts>  Comma-separated file extensions to include
  --babel-plugin-path <path>   Path to babel-plugin-react-compiler
  --help                       Show this help message
  --version                    Show version number
`.trim();

const DEFAULT_BABEL_PLUGIN_PATH = "node_modules/babel-plugin-react-compiler";

const STANDALONE_CSS = `
:root {
  --rcm-bg: #1e1e1e;
  --rcm-foreground: #d4d4d4;
  --rcm-border: #3c3c3c;
  --rcm-input-bg: #2d2d2d;
  --rcm-input-fg: #d4d4d4;
  --rcm-input-border: #3c3c3c;
  --rcm-input-placeholder: #6e6e6e;
  --rcm-button-bg: #3c3c3c;
  --rcm-button-fg: #d4d4d4;
  --rcm-button-hover-bg: #505050;
  --rcm-list-hover-bg: #2a2d2e;
  --rcm-success: #4caf50;
  --rcm-failed: #f44336;
  --rcm-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --rcm-font-size: 13px;
  --rcm-editor-font-family: "SF Mono", Monaco, Menlo, Consolas, "Courier New", monospace;
  --rcm-editor-font-size: 13px;
}
@media (prefers-color-scheme: light) {
  :root {
    --rcm-bg: #ffffff;
    --rcm-foreground: #1e1e1e;
    --rcm-border: #e0e0e0;
    --rcm-input-bg: #f5f5f5;
    --rcm-input-fg: #1e1e1e;
    --rcm-input-border: #cecece;
    --rcm-input-placeholder: #999999;
    --rcm-button-bg: #e8e8e8;
    --rcm-button-fg: #1e1e1e;
    --rcm-button-hover-bg: #d4d4d4;
    --rcm-list-hover-bg: #f0f0f0;
  }
}
`;

function resolveBabelPluginPath(root: string, userPath?: string): string {
  if (userPath) {
    // The server expects a path relative to root that gets joined with it
    const absolute = path.resolve(userPath);
    return path.relative(root, absolute);
  }
  // Check the default location exists
  const fullPath = path.join(root, DEFAULT_BABEL_PLUGIN_PATH);
  try {
    require.resolve(fullPath);
  } catch {
    process.stderr.write(
      "Error: Could not find babel-plugin-react-compiler in " +
        `${fullPath}. Install it or pass --babel-plugin-path.\n`
    );
    process.exit(1);
  }
  return DEFAULT_BABEL_PLUGIN_PATH;
}

function openInBrowser(filePath: string): void {
  const platform = os.platform();
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  exec(`${cmd} ${JSON.stringify(filePath)}`);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      format: { type: "string", default: "text" },
      output: { type: "string" },
      "exclude-dirs": { type: "string" },
      "include-extensions": { type: "string" },
      "babel-plugin-path": { type: "string" },
      help: { type: "boolean", default: false },
      version: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (values.version) {
    console.log(VERSION);
    process.exit(0);
  }

  const format = values.format as string;
  if (!["text", "html", "json"].includes(format)) {
    process.stderr.write(`Error: Unknown format "${format}". Use text, html, or json.\n`);
    process.exit(1);
  }

  const root = path.resolve(positionals[0] ?? ".");
  const babelPluginPath = resolveBabelPluginPath(root, values["babel-plugin-path"]);
  const excludeDirs = values["exclude-dirs"]?.split(",").map((s) => s.trim());
  const includeExtensions = values["include-extensions"]
    ?.split(",")
    .map((s) => (s.trim().startsWith(".") ? s.trim() : `.${s.trim()}`));

  process.stderr.write(`Scanning ${root}...\n`);

  const startTime = performance.now();
  const report = await generateReport({
    root,
    babelPluginPath,
    excludeDirs,
    includeExtensions,
    onProgress({ processed, total }) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      process.stderr.write(`\rScanning... ${processed}/${total} files (${elapsed}s)`);
    },
  });
  const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);

  process.stderr.write(`\nDone in ${totalTime}s\n`);

  const output = formatOutput(report, format);
  const outputPath = values.output;

  if (outputPath) {
    fs.writeFileSync(outputPath, output, "utf8");
    process.stderr.write(`Report written to ${outputPath}\n`);
  } else if (format === "html") {
    const tmpFile = path.join(os.tmpdir(), `react-compiler-report-${Date.now()}.html`);
    fs.writeFileSync(tmpFile, output, "utf8");
    process.stderr.write(`Opening report in browser: ${tmpFile}\n`);
    openInBrowser(tmpFile);
  } else {
    process.stdout.write(output);
  }

  const hasFailures = report.totals.failedCount > 0 || report.errors.length > 0;
  process.exit(hasFailures ? 1 : 0);
}

function formatOutput(report: ReactCompilerReport, format: string): string {
  switch (format) {
    case "json":
      return JSON.stringify(report, null, 2) + "\n";
    case "html": {
      const tree = buildReportTree(report);
      return getReportHtml({
        data: tree,
        emojis: { success: "\u2705", error: "\u274C", skipped: "\u23ED\uFE0F" },
        theme: "auto",
        headExtra: `<style>${STANDALONE_CSS}</style>`,
      });
    }
    case "text":
    default:
      return formatText(report);
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error?.message ?? error}\n`);
  process.exit(1);
});
