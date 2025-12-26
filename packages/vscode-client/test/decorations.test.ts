import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { checkReactCompiler } = require(path.join(__dirname, "..", "..", "..", "server", "out", "checkReactCompiler"));

function readFixture(name: string): string {
  const candidates = [
    path.join(__dirname, "fixtures", name),
    // When running compiled tests from out/test, jump back to test fixtures
    path.join(__dirname, "..", "..", "test", "fixtures", name),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf8");
    }
  }
  throw new Error(
    `Fixture not found: ${name} in any of: \n${candidates.join("\n")}`
  );
}

// Helper to call checkReactCompiler with test defaults
function compileFixture(text: string, filename: string) {
  return checkReactCompiler(
    text,
    filename,
    undefined, // workspaceFolder
    "node_modules/babel-plugin-react-compiler" // babelPluginPath
  );
}

suite("React Compiler detection for export styles", () => {
  interface Case {
    file: string;
    description: string;
  }

  const cases: Case[] = [
    {
      file: "export-default-function.tsx",
      description: "export default function Component() {}",
    },
    {
      file: "export-default-async-function.tsx",
      description: "export default async function Component() {}",
    },
    {
      file: "export-async-function.tsx",
      description: "export async function Component() {}",
    },
    {
      file: "export-named-function.tsx",
      description: "export function Component() {}",
    },
    {
      file: "async-function.tsx",
      description: "async function Component() {}",
    },
    {
      file: "named-function.tsx",
      description: "function Component() {}",
    },
    {
      file: "export-const-arrow.tsx",
      description: "export const Component = () => null",
    },
    {
      file: "const-arrow.tsx",
      description: "const Component = () => null",
    },
    {
      file: "nested-function.tsx",
      description: "nested block: indented named function",
    },
  ];

  for (const c of cases) {
    test(c.description, () => {
      const text = readFixture(c.file).trim();
      const filename = `/mock/${c.file}`;

      const { successfulCompilations, failedCompilations } = compileFixture(
        text,
        filename
      );

      // Each fixture should have exactly one component that compiles successfully
      assert.strictEqual(
        successfulCompilations.length,
        1,
        `Expected 1 successful compilation for ${c.file}, got ${successfulCompilations.length}`
      );
      assert.strictEqual(
        failedCompilations.length,
        0,
        `Expected 0 failed compilations for ${c.file}, got ${failedCompilations.length}`
      );

      // Verify the compilation has location info
      const compilation = successfulCompilations[0];
      assert.ok(compilation.fnLoc, "Compilation should have fnLoc");
      assert.ok(
        compilation.fnLoc.start,
        "Compilation should have fnLoc.start"
      );
    });
  }
});

suite("Critical error handling", () => {
  test("critical-error.tsx: handles compilation errors gracefully without crashing", () => {
    const text = readFixture("critical-error.tsx").trim();
    const filename = "/mock/critical-error.tsx";

    // This should not throw an error even if the file has compilation issues
    const { successfulCompilations, failedCompilations } = compileFixture(
      text,
      filename
    );

    // The extension should handle errors gracefully
    // Either it returns failed compilations or empty arrays
    assert.ok(
      Array.isArray(successfulCompilations),
      "successfulCompilations should be an array"
    );
    assert.ok(
      Array.isArray(failedCompilations),
      "failedCompilations should be an array"
    );
  });

  test("error-without-ranges.tsx: handles errors without location ranges gracefully", () => {
    const text = readFixture("error-without-ranges.tsx").trim();
    const filename = "/mock/error-without-ranges.tsx";

    // This should not throw an error even if the file has compilation issues without ranges
    const { successfulCompilations, failedCompilations } = compileFixture(
      text,
      filename
    );

    // The extension should handle errors gracefully
    assert.ok(
      Array.isArray(successfulCompilations),
      "successfulCompilations should be an array"
    );
    assert.ok(
      Array.isArray(failedCompilations),
      "failedCompilations should be an array"
    );
  });
});
