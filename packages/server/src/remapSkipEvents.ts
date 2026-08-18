import { NodePath, PluginObj, types as t } from "@babel/core";
import type { EventLocation, LoggerEvent } from "./checkReactCompiler";

/**
 * babel-plugin-react-compiler reports CompileSkip events with fnLoc set to the
 * function *body* location (the `{` block), unlike other events which use the
 * function's own location. With a multi-line signature that puts the marker on
 * the closing line of the parameter list instead of the function line.
 *
 * The returned `plugin` records every function's real location keyed by its
 * body start (it must run before the compiler plugin in the same pipeline),
 * and `remapSkipEvent` swaps a skip event's body location for it.
 */
export function createSkipEventRemapper(): {
  plugin: PluginObj;
  remapSkipEvent: (event: LoggerEvent) => LoggerEvent;
} {
  const fnLocByBodyStart = new Map<string, EventLocation>();

  const plugin: PluginObj = {
    visitor: {
      // Record eagerly on Program enter, before the compiler plugin (which
      // also runs on Program) transforms the tree.
      Program(programPath) {
        programPath.traverse({
          Function({ node }: NodePath<t.Function>) {
            if (node.body.type === "BlockStatement" && node.body.loc && node.loc) {
              const { line, column } = node.body.loc.start;
              fnLocByBodyStart.set(`${line}:${column}`, node.loc);
            }
          },
        });
      },
    },
  };

  function remapSkipEvent(event: LoggerEvent): LoggerEvent {
    const { line, column } = event.fnLoc?.start ?? {};
    const fnLoc = fnLocByBodyStart.get(`${line}:${column}`) ?? event.fnLoc;
    return { ...event, fnLoc };
  }

  return { plugin, remapSkipEvent };
}
