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
function compileFixture(text: string, filename: string, compilationMode: string = "infer") {
  return checkReactCompiler(
    text,
    filename,
    undefined, // workspaceFolder
    "node_modules/babel-plugin-react-compiler", // babelPluginPath
    compilationMode
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

  test('use-no-memo.tsx: opted-out functions are reported as skipped, not failed', () => {
    const text = readFixture("use-no-memo.tsx").trim();
    const filename = "/mock/use-no-memo.tsx";

    const { successfulCompilations, failedCompilations, skippedCompilations } =
      compileFixture(text, filename);

    assert.ok(Array.isArray(skippedCompilations), "skippedCompilations should be an array");
    assert.strictEqual(
      skippedCompilations.length,
      1,
      `Expected 1 skipped compilation, got ${skippedCompilations.length}`
    );
    assert.strictEqual(
      successfulCompilations.length,
      1,
      `Expected 1 successful compilation, got ${successfulCompilations.length}`
    );

    // No remaining failure should overlap the opted-out component's range.
    const skipStart = skippedCompilations[0].fnLoc?.start?.line ?? 0;
    const skipEnd = skippedCompilations[0].fnLoc?.end?.line ?? skipStart;
    for (const failed of failedCompilations) {
      const failStart = failed.fnLoc?.start?.line ?? 0;
      const failEnd = failed.fnLoc?.end?.line ?? failStart;
      const overlaps = failStart <= skipEnd && skipStart <= failEnd;
      assert.ok(
        !overlaps,
        `Failure at line ${failStart} overlaps the opted-out component (lines ${skipStart}-${skipEnd}); opt-outs must not be reported as failures.`
      );
    }
  });

  test('annotation-mode.tsx: only "use memo" components compile under compilationMode: "annotation"', () => {
    const text = readFixture("annotation-mode.tsx").trim();
    const filename = "/mock/annotation-mode.tsx";

    const inferred = compileFixture(text, filename, "infer");
    assert.strictEqual(
      inferred.successfulCompilations.length,
      2,
      `Expected 2 compiled components under "infer", got ${inferred.successfulCompilations.length}`
    );

    // Same content and filename as above: the compilation cache must key on the mode too,
    // otherwise this reads back the "infer" result.
    const annotated = compileFixture(text, filename, "annotation");
    assert.strictEqual(
      annotated.successfulCompilations.length,
      1,
      `Expected only the "use memo" component to compile under "annotation", got ${annotated.successfulCompilations.length}`
    );
    const compiled = annotated.successfulCompilations[0];
    assert.ok(
      compiled.fnName?.includes("OptedIn") || /OptedInComponent/.test(JSON.stringify(compiled)),
      `Expected OptedInComponent to be the compiled function, got ${compiled.fnName}`
    );
  });

  test("compilation cache is keyed by compilation mode, not just source and filename", () => {
    const text = readFixture("annotation-mode.tsx").trim();
    const filename = "/mock/annotation-mode-cache.tsx";

    // Populate the cache under "annotation" first, then read the same file back under
    // "infer" and vice versa: neither mode may serve the other's cached result.
    const annotated = compileFixture(text, filename, "annotation");
    const inferred = compileFixture(text, filename, "infer");
    const annotatedAgain = compileFixture(text, filename, "annotation");

    assert.strictEqual(
      annotated.successfulCompilations.length,
      1,
      `Expected 1 compiled component under "annotation", got ${annotated.successfulCompilations.length}`
    );
    assert.strictEqual(
      inferred.successfulCompilations.length,
      2,
      `Expected 2 compiled components under "infer", got ${inferred.successfulCompilations.length}`
    );
    assert.strictEqual(
      annotatedAgain.successfulCompilations.length,
      1,
      `Expected the cached "annotation" entry to survive an "infer" run, got ${annotatedAgain.successfulCompilations.length}`
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

suite("Parser selection", () => {
  test("flow-modern-syntax.js: modern Flow syntax is parsed via hermes-parser", () => {
    const text = readFixture("flow-modern-syntax.js").trim();
    const filename = "/mock/flow-modern-syntax.js";

    const { successfulCompilations, failedCompilations } = compileFixture(
      text,
      filename
    );

    // @babel/parser's flow plugin rejects `readonly` in object types, which
    // leaves every bucket empty. hermes-parser accepts it.
    assert.strictEqual(
      successfulCompilations.length,
      1,
      `Expected 1 successful compilation, got ${successfulCompilations.length} (${failedCompilations.length} failed). Modern Flow syntax was not parsed.`
    );
  });

  test("top-level-await.mjs: files without a Flow pragma keep top-level await", () => {
    const text = readFixture("top-level-await.mjs").trim();
    const filename = "/mock/top-level-await.mjs";

    const { successfulCompilations, failedCompilations } = compileFixture(
      text,
      filename
    );

    // hermes-parser has no top-level await support, so routing every .mjs file
    // to it would drop this component silently.
    assert.strictEqual(
      successfulCompilations.length,
      1,
      `Expected 1 successful compilation, got ${successfulCompilations.length} (${failedCompilations.length} failed). Top-level await was not parsed.`
    );
  });
});
