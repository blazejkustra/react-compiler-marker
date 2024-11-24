import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as types from "@babel/types";

export function detectFunctionComponents(sourceCode: string): number[] {
  const ast = parse(sourceCode, {
    sourceType: "module",
    plugins: ["jsx", "typescript"], // Enable JSX and TypeScript parsing
  });

  const positions: number[] = [];

  traverse(ast, {
    // Detect arrow functions that return JSX
    VariableDeclarator(path: NodePath<types.VariableDeclarator>) {
      const init = path.node.init;
      if (
        types.isArrowFunctionExpression(init) &&
        path.node.id.loc?.start.line &&
        containsJSX(path)
      ) {
        positions.push(path.node.id.loc?.start.line);
      }
    },
    // Detect regular function declarations that return JSX
    FunctionDeclaration(path: NodePath<types.FunctionDeclaration>) {
      if (path.node.id?.loc?.start.line && containsJSX(path)) {
        positions.push(path.node.id?.loc?.start.line);
      }
    },
  });

  return positions;
}

// Helper to check if a function body contains JSX
function containsJSX(path: NodePath): boolean {
  let foundJSX = false;

  // Use `path.traverse` instead of `traverse`
  path.traverse({
    JSXElement() {
      foundJSX = true; // JSX found
    },
    JSXFragment() {
      foundJSX = true; // JSX fragment (<>...</>) found
    },
  });

  return foundJSX; // Return true if any JSX is found
}
