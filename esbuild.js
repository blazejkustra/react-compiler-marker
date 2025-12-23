const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

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
  // Build the LSP server
  const serverCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ["packages/server/src/server.ts"],
    outfile: "dist/server.js",
    external: [],
  });

  // Build the VS Code client extension
  const clientCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ["packages/vscode-client/src/extension.ts"],
    outfile: "dist/extension.js",
    external: ["vscode"],
  });

  if (watch) {
    await Promise.all([serverCtx.watch(), clientCtx.watch()]);
  } else {
    await Promise.all([serverCtx.rebuild(), clientCtx.rebuild()]);
    await Promise.all([serverCtx.dispose(), clientCtx.dispose()]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
