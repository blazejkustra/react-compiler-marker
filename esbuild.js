const esbuild = require("esbuild");
const path = require("path");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

// Resolve paths relative to this file's location (repo root)
const rootDir = __dirname;

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(
            `    ${location.file}:${location.line}:${location.column}:`
          );
        }
      });
      console.log("[watch] build finished");
    });
  },
};

/**
 * Shared build options
 */
const sharedOptions = {
  bundle: true,
  format: "cjs",
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: "node",
  logLevel: "silent",
  plugins: [esbuildProblemMatcherPlugin],
};

async function main() {
  // Build the LSP server for VS Code
  const serverCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: [path.join(rootDir, "packages/server/src/server.ts")],
    outfile: path.join(rootDir, "packages/vscode-client/dist/server.js"),
    external: [],
  });

  // Build the LSP server for Neovim (bundled)
  const nvimServerCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: [path.join(rootDir, "packages/server/src/server.ts")],
    outfile: path.join(rootDir, "packages/nvim-client/server/server.bundle.js"),
    external: [],
  });

  // Build the VS Code client extension
  const clientCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: [path.join(rootDir, "packages/vscode-client/src/extension.ts")],
    outfile: path.join(rootDir, "packages/vscode-client/dist/extension.js"),
    external: ["vscode"],
  });

  if (watch) {
    await Promise.all([serverCtx.watch(), nvimServerCtx.watch(), clientCtx.watch()]);
  } else {
    await Promise.all([serverCtx.rebuild(), nvimServerCtx.rebuild(), clientCtx.rebuild()]);
    await Promise.all([serverCtx.dispose(), nvimServerCtx.dispose(), clientCtx.dispose()]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
