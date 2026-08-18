// Stand-in for a project-local `babel-plugin-react-compiler`. It reports a
// CompileSuccess naming the root it was loaded from, so a test can tell which
// project's plugin actually ran.
module.exports = function stubReactCompilerProjectB(_api, options) {
  return {
    name: "stub-react-compiler-project-b",
    visitor: {
      Program() {
        options?.logger?.logEvent("stub", {
          kind: "CompileSuccess",
          fnName: "stub-plugin-from-project-b",
          fnLoc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
        });
      },
    },
  };
};
