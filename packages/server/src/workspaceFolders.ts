import * as path from "path";
import { fileURLToPath } from "node:url";

/**
 * Convert a workspace folder or document URI to a filesystem path.
 *
 * `file://` URIs are decoded properly (so percent-escaped characters such as
 * spaces survive); anything else — including a plain path — is returned as is.
 */
export function workspaceFolderUriToPath(uri: string): string {
  if (!uri.startsWith("file://")) {
    return uri;
  }
  try {
    return fileURLToPath(uri);
  } catch {
    // Malformed file URI: fall back to stripping the scheme.
    return uri.slice("file://".length);
  }
}

/**
 * Find the workspace folder that contains `documentPath`.
 *
 * In a multi-root workspace several folders may be open at once, and roots can
 * even be nested. The most specific (longest) containing root wins, so a file
 * in `<monorepo>/packages/app` resolves to that package rather than the
 * monorepo root when both are open.
 *
 * Returns `undefined` when the document lives outside every root — callers
 * decide what to fall back to.
 */
export function resolveWorkspaceFolder(
  documentPath: string,
  folders: readonly string[]
): string | undefined {
  if (!documentPath || folders.length === 0) {
    return undefined;
  }

  const target = normalizeForComparison(documentPath);
  let match: string | undefined;
  let matchLength = -1;

  for (const folder of folders) {
    if (!folder) {
      continue;
    }
    const root = normalizeForComparison(folder);
    // Compare on path boundaries so `/ws/project-a` does not swallow
    // `/ws/project-a-extra`.
    const isInside =
      target === root || target.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
    if (isInside && root.length > matchLength) {
      match = folder;
      matchLength = root.length;
    }
  }

  return match;
}

/**
 * Windows paths are case-insensitive, and the casing VS Code reports for a
 * document URI need not match the casing of the workspace folder it came from
 * (drive letters especially). Comparing those verbatim would drop the document
 * to the fallback root and compile it with the wrong root's plugin — the very
 * bug this module exists to prevent. Other platforms are left case-sensitive,
 * since two roots differing only by case are then genuinely different folders.
 */
function normalizeForComparison(target: string): string {
  const resolved = path.resolve(target);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

/**
 * Resolve the workspace folder for a document URI, falling back to the first
 * open folder when the document lives outside every root (e.g. an untitled or
 * external file). Returns `undefined` when no folders are open at all.
 */
export function resolveWorkspaceFolderForUri(
  documentUri: string,
  folders: readonly string[]
): string | undefined {
  const documentPath = workspaceFolderUriToPath(documentUri);
  return resolveWorkspaceFolder(documentPath, folders) ?? folders[0];
}
