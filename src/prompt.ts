/**
 * Generates an AI prompt for fixing React Compiler issues
 */
function generateAIPrompt(
  reason: string,
  code: string,
  filename: string,
  startLine: number,
  endLine: number
): string {
  const lineRange =
    startLine === endLine
      ? `line ${startLine}`
      : `lines ${startLine}-${endLine}`;

  return `I have a React component that the React Compiler couldn't optimize. Here's the issue:

**File:** ${filename}
**Location:** ${lineRange}
**Reason:** ${reason}

**Code:**
\`\`\`ts
${code}
\`\`\`

Please help me fix this code so that the React Compiler can optimize it. The React Compiler automatically memoizes components and their dependencies, but it needs the code to follow certain patterns. Please provide the corrected code and explain what changes you made and why they help the React Compiler optimize the component.`;
}

export { generateAIPrompt };
