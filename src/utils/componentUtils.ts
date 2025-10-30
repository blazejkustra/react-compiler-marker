/**
 * Checks if a component has the disable comment above it
 * @param sourceCode The full source code of the file
 * @param componentStartLine The line number where the component starts (1-indexed)
 * @returns true if the component has `// react-compiler-marker-disable` comment above it
 */
export function isComponentDisabled(
  sourceCode: string,
  componentStartLine: number
): boolean {
  const lines = sourceCode.split("\n");
  const lineAbove = componentStartLine - 2;

  if (lineAbove >= 0 && lineAbove < lines.length) {
    const commentLine = lines[lineAbove].trim();
    return commentLine.includes("react-compiler-marker-disable");
  }

  return false;
}
