import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

/* eslint-disable @typescript-eslint/no-require-imports */
const serverOut = path.join(__dirname, "..", "..", "..", "server", "out");
const {
  checkReactCompiler,
  clearPluginCache,
  clearCompilationCache,
} = require(path.join(serverOut, "checkReactCompiler"));
// Required lazily so that a missing module fails only the suite that needs it.
function workspaceFolders() {
  return require(path.join(serverOut, "workspaceFolders"));
}
/* eslint-enable @typescript-eslint/no-require-imports */

function resolveWorkspaceFolder(documentPath: string, roots: string[]): string | undefined {
  return workspaceFolders().resolveWorkspaceFolder(documentPath, roots);
}

function workspaceFolderUriToPath(uri: string): string {
  return workspaceFolders().workspaceFolderUriToPath(uri);
}

function resolveWorkspaceFolderForUri(uri: string, roots: string[]): string | undefined {
  return workspaceFolders().resolveWorkspaceFolderForUri(uri, roots);
}

// Fixtures live in `test/fixtures`, but compiled tests run from `out/test`.
function fixtureDir(...segments: string[]): string {
  const candidates = [
    path.join(__dirname, "fixtures", ...segments),
    path.join(__dirname, "..", "..", "test", "fixtures", ...segments),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Fixture not found: ${segments.join("/")} in any of:\n${candidates.join("\n")}`);
}

// Each fixture root ships a stub plugin that logs a CompileSuccess naming its
// own root, so the reported `fnName` tells us which root's plugin actually ran.
const STUB_PLUGIN_PATH = path.join("plugins", "stub-compiler.js");

suite("Multi-root workspace: plugin resolution", () => {
  setup(() => {
    clearPluginCache();
    clearCompilationCache();
  });

  teardown(() => {
    clearPluginCache();
    clearCompilationCache();
  });

  test("each workspace root loads its own babel-plugin-react-compiler", () => {
    const rootA = fixtureDir("multi-root", "project-a");
    const rootB = fixtureDir("multi-root", "project-b");
    const sourceA = fs.readFileSync(path.join(rootA, "App.tsx"), "utf8");
    const sourceB = fs.readFileSync(path.join(rootB, "App.tsx"), "utf8");

    const resultA = checkReactCompiler(
      sourceA,
      path.join(rootA, "App.tsx"),
      rootA,
      STUB_PLUGIN_PATH,
      "infer"
    );
    const resultB = checkReactCompiler(
      sourceB,
      path.join(rootB, "App.tsx"),
      rootB,
      STUB_PLUGIN_PATH,
      "infer"
    );

    assert.strictEqual(
      resultA.successfulCompilations[0]?.fnName,
      "stub-plugin-from-project-a",
      "project-a's file must be analyzed with project-a's plugin"
    );
    // Without a per-root plugin cache the module-level singleton keeps serving
    // project-a's plugin here, even though project-b's root was passed in.
    assert.strictEqual(
      resultB.successfulCompilations[0]?.fnName,
      "stub-plugin-from-project-b",
      "project-b's file must be analyzed with project-b's plugin, not the first root's"
    );
  });

  test("plugin cache still avoids re-requiring the same root", () => {
    const rootA = fixtureDir("multi-root", "project-a");
    const pluginModule = path.join(rootA, STUB_PLUGIN_PATH);
    const source = fs.readFileSync(path.join(rootA, "App.tsx"), "utf8");

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(pluginModule);
    const loadedOnce = require.cache[require.resolve(pluginModule)];

    checkReactCompiler(source, path.join(rootA, "one.tsx"), rootA, STUB_PLUGIN_PATH, "infer");
    checkReactCompiler(source, path.join(rootA, "two.tsx"), rootA, STUB_PLUGIN_PATH, "infer");

    assert.strictEqual(
      require.cache[require.resolve(pluginModule)],
      loadedOnce,
      "repeated checks against one root must not reload the plugin"
    );
  });

  test("the compilation cache does not serve one root's result to another", () => {
    const rootA = fixtureDir("multi-root", "project-a");
    const rootB = fixtureDir("multi-root", "project-b");
    const source = fs.readFileSync(path.join(rootA, "App.tsx"), "utf8");

    // Same absolute filename, same content, same mode — only the root differs.
    // Reachable for real when nested roots are open: a report scanning the outer
    // root sees the same file the inlay hints resolve to the inner root.
    const shared = "/mock/shared/App.tsx";
    const viaA = checkReactCompiler(source, shared, rootA, STUB_PLUGIN_PATH, "infer");
    const viaB = checkReactCompiler(source, shared, rootB, STUB_PLUGIN_PATH, "infer");

    assert.strictEqual(
      viaA.successfulCompilations[0]?.fnName,
      "stub-plugin-from-project-a",
      "the first root's plugin should produce the first result"
    );
    assert.strictEqual(
      viaB.successfulCompilations[0]?.fnName,
      "stub-plugin-from-project-b",
      "a cache keyed without the root would replay project-a's result here"
    );
  });

  test("a root without a local plugin falls back once, not per file", () => {
    const rootA = fixtureDir("multi-root", "project-a");
    const missing = path.join("plugins", "does-not-exist.js");
    const source = fs.readFileSync(path.join(rootA, "App.tsx"), "utf8");

    // The bundled plugin takes over; the point is that it is then cached under
    // this root's key so the failing require() is not retried for every file.
    checkReactCompiler(source, path.join(rootA, "one.tsx"), rootA, missing, "infer");
    const cachedAfterFallback = checkReactCompiler(
      source,
      path.join(rootA, "two.tsx"),
      rootA,
      missing,
      "infer"
    );

    assert.ok(
      Array.isArray(cachedAfterFallback.successfulCompilations),
      "the bundled plugin should still produce a result"
    );
    // The stub was never involved, so no stub event may appear.
    assert.ok(
      !cachedAfterFallback.successfulCompilations.some((event: { fnName?: string }) =>
        event.fnName?.startsWith("stub-plugin-from-")
      ),
      "a missing local plugin must fall back to the bundled compiler, not a stub"
    );
  });

  test("clearPluginCache drops every cached root", () => {
    const rootA = fixtureDir("multi-root", "project-a");
    const rootB = fixtureDir("multi-root", "project-b");
    const sourceA = fs.readFileSync(path.join(rootA, "App.tsx"), "utf8");
    const sourceB = fs.readFileSync(path.join(rootB, "App.tsx"), "utf8");

    checkReactCompiler(sourceA, path.join(rootA, "App.tsx"), rootA, STUB_PLUGIN_PATH, "infer");
    checkReactCompiler(sourceB, path.join(rootB, "App.tsx"), rootB, STUB_PLUGIN_PATH, "infer");

    clearPluginCache();
    clearCompilationCache();

    const again = checkReactCompiler(
      sourceB,
      path.join(rootB, "App.tsx"),
      rootB,
      STUB_PLUGIN_PATH,
      "infer"
    );
    assert.strictEqual(
      again.successfulCompilations[0]?.fnName,
      "stub-plugin-from-project-b",
      "after clearing, each root must reload its own plugin"
    );
  });
});

// The common monorepo setup: one root at the top, the plugin installed only in
// the sub-package that uses it. Diagnosed by Isaac Hinman
// (isaachinman/zed-react-compiler-marker).
suite("Single-root monorepo: plugin discovery below the root", () => {
  const DEFAULT_PLUGIN_PATH = path.join("node_modules", "babel-plugin-react-compiler");

  setup(() => {
    clearPluginCache();
    clearCompilationCache();
  });

  teardown(() => {
    clearPluginCache();
    clearCompilationCache();
  });

  test("finds a plugin a sub-package installed", () => {
    const root = fixtureDir("single-root");
    const source = fs.readFileSync(path.join(root, "App.tsx"), "utf8");

    const result = checkReactCompiler(
      source,
      path.join(root, "App.tsx"),
      root,
      DEFAULT_PLUGIN_PATH,
      "infer"
    );

    assert.strictEqual(
      result.successfulCompilations[0]?.fnName,
      "stub-plugin-from-apps-web",
      "the root has no plugin of its own, so apps/web's must be used"
    );
  });

  test("the shallowest install wins", () => {
    const root = fixtureDir("single-root");
    const source = fs.readFileSync(path.join(root, "App.tsx"), "utf8");

    const result = checkReactCompiler(
      source,
      path.join(root, "App.tsx"),
      root,
      DEFAULT_PLUGIN_PATH,
      "infer"
    );

    assert.notStrictEqual(
      result.successfulCompilations[0]?.fnName,
      "stub-plugin-from-inner",
      "a deeper install must not beat the one nearer the root"
    );
  });

  test("does not descend into node_modules", () => {
    const root = fixtureDir("dependency-only");
    const source = fs.readFileSync(path.join(root, "App.tsx"), "utf8");

    // The only plugin here belongs to a dependency, so the bundled compiler
    // takes over rather than a package this workspace never asked for.
    const result = checkReactCompiler(
      source,
      path.join(root, "App.tsx"),
      root,
      DEFAULT_PLUGIN_PATH,
      "infer"
    );

    assert.ok(
      !result.successfulCompilations.some((event: { fnName?: string }) =>
        event.fnName?.startsWith("stub-plugin-from-")
      ),
      "a plugin inside a dependency's node_modules must never be picked up"
    );
  });

  test("the search runs once per root, not once per file", () => {
    const root = fixtureDir("single-root");
    const pluginModule = path.join(root, "apps", "web", DEFAULT_PLUGIN_PATH);
    const source = fs.readFileSync(path.join(root, "App.tsx"), "utf8");

    checkReactCompiler(source, path.join(root, "one.tsx"), root, DEFAULT_PLUGIN_PATH, "infer");
    const loadedOnce = require.cache[require.resolve(pluginModule)];
    assert.ok(loadedOnce, "the discovered plugin should be in the require cache");

    checkReactCompiler(source, path.join(root, "two.tsx"), root, DEFAULT_PLUGIN_PATH, "infer");

    assert.strictEqual(
      require.cache[require.resolve(pluginModule)],
      loadedOnce,
      "a second file must reuse the cached plugin instead of rescanning"
    );
  });
});

suite("Multi-root workspace: root resolution for a document", () => {
  const roots = ["/ws/project-a", "/ws/project-b"];

  test("picks the root that contains the document", () => {
    assert.strictEqual(resolveWorkspaceFolder("/ws/project-b/src/App.tsx", roots), "/ws/project-b");
    assert.strictEqual(resolveWorkspaceFolder("/ws/project-a/src/App.tsx", roots), "/ws/project-a");
  });

  test("prefers the most specific root when roots are nested", () => {
    const nested = ["/ws/monorepo", "/ws/monorepo/packages/app"];
    assert.strictEqual(
      resolveWorkspaceFolder("/ws/monorepo/packages/app/src/App.tsx", nested),
      "/ws/monorepo/packages/app"
    );
    assert.strictEqual(
      resolveWorkspaceFolder("/ws/monorepo/scripts/build.ts", nested),
      "/ws/monorepo"
    );
  });

  test("does not match a root that is only a string prefix of the path", () => {
    assert.strictEqual(resolveWorkspaceFolder("/ws/project-a-extra/src/App.tsx", roots), undefined);
  });

  test("matches a document that is the root itself", () => {
    assert.strictEqual(resolveWorkspaceFolder("/ws/project-a", roots), "/ws/project-a");
  });

  test("returns undefined for a file outside every root", () => {
    assert.strictEqual(resolveWorkspaceFolder("/elsewhere/App.tsx", roots), undefined);
  });

  test("handles an empty root list", () => {
    assert.strictEqual(resolveWorkspaceFolder("/ws/project-a/src/App.tsx", []), undefined);
  });

  // This is what all four server call sites actually use.
  test("resolveWorkspaceFolderForUri picks the containing root for a file URI", () => {
    assert.strictEqual(
      resolveWorkspaceFolderForUri("file:///ws/project-b/src/App.tsx", roots),
      "/ws/project-b"
    );
  });

  test("resolveWorkspaceFolderForUri decodes escaped characters before matching", () => {
    assert.strictEqual(
      resolveWorkspaceFolderForUri("file:///ws/project-b/src/My%20App.tsx", roots),
      "/ws/project-b",
      "a path with a space must still resolve to its root, not the fallback"
    );
  });

  test("resolveWorkspaceFolderForUri falls back to the first root when outside every root", () => {
    assert.strictEqual(
      resolveWorkspaceFolderForUri("file:///elsewhere/App.tsx", roots),
      "/ws/project-a"
    );
  });

  test("resolveWorkspaceFolderForUri returns undefined when no folders are open", () => {
    assert.strictEqual(resolveWorkspaceFolderForUri("file:///elsewhere/App.tsx", []), undefined);
  });

  test("converts file:// URIs to paths", () => {
    assert.strictEqual(
      workspaceFolderUriToPath("file:///ws/project-a"),
      path.sep + path.join("ws", "project-a")
    );
    assert.strictEqual(
      workspaceFolderUriToPath("file:///ws/with%20space"),
      path.sep + path.join("ws", "with space")
    );
    // Non-file URIs (and plain paths) pass through untouched.
    assert.strictEqual(workspaceFolderUriToPath("/ws/project-a"), "/ws/project-a");
  });
});
