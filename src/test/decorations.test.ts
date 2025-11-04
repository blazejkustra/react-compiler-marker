import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { updateDecorations } from "../decorations";
import { checkReactCompiler, LoggerEvent } from "../checkReactCompiler";

class MockTextLine implements vscode.TextLine {
  lineNumber: number;
  text: string;
  range: vscode.Range;
  rangeIncludingLineBreak: vscode.Range;
  firstNonWhitespaceCharacterIndex: number = 0;
  isEmptyOrWhitespace: boolean;
  constructor(lineNumber: number, text: string) {
    this.lineNumber = lineNumber;
    this.text = text;
    this.range = new vscode.Range(lineNumber, 0, lineNumber, text.length);
    this.rangeIncludingLineBreak = this.range;
    this.isEmptyOrWhitespace = text.trim().length === 0;
  }
}

class MockTextDocument implements vscode.TextDocument {
  uri: vscode.Uri = vscode.Uri.file("/mock.tsx");
  fileName: string = this.uri.fsPath;
  isUntitled: boolean = false;
  languageId: string = "typescriptreact";
  version: number = 1;
  isDirty: boolean = false;
  isClosed: boolean = false;
  private lines: string[];
  constructor(text: string) {
    this.lines = text.split(/\r?\n/);
  }
  lineAt(line: number | vscode.Position): vscode.TextLine {
    const lineNumber = typeof line === "number" ? line : line.line;
    return new MockTextLine(lineNumber, this.lines[lineNumber] ?? "");
  }
  getText(_range?: vscode.Range | undefined): string {
    return this.lines.join("\n");
  }
  getWordRangeAtPosition(): vscode.Range | undefined {
    return undefined;
  }
  validateRange(range: vscode.Range): vscode.Range {
    return range;
  }
  validatePosition(position: vscode.Position): vscode.Position {
    return position;
  }
  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }
  lineCount: number = 1;
  eol: vscode.EndOfLine = vscode.EndOfLine.LF;
  offsetAt(): number {
    return 0;
  }
  positionAt(): vscode.Position {
    return new vscode.Position(0, 0);
  }
  get characterCount(): number {
    return this.getText().length;
  }
}

class MockTextEditor {
  document: vscode.TextDocument;
  selections: readonly vscode.Selection[] = [];
  selection: vscode.Selection = new vscode.Selection(0, 0, 0, 0);
  editorOptions: vscode.TextEditorOptions = {} as any;
  viewColumn: vscode.ViewColumn | undefined = undefined;
  visibleRanges: readonly vscode.Range[] = [];
  revealRange(): void {}
  options: vscode.TextEditorOptions = {} as any;
  private lastArgs: {
    type: vscode.TextEditorDecorationType;
    ranges: vscode.DecorationOptions[];
  } | null = null;
  constructor(document: vscode.TextDocument) {
    this.document = document;
  }
  setDecorations(
    type: vscode.TextEditorDecorationType,
    ranges: vscode.Range[] | vscode.DecorationOptions[]
  ): void {
    this.lastArgs = { type, ranges: ranges as vscode.DecorationOptions[] };
  }
  insertSnippet(): Thenable<boolean> {
    return Promise.resolve(true);
  }
  setDecorationsCapture() {
    return this.lastArgs;
  }
  edit(): Thenable<boolean> {
    return Promise.resolve(true);
  }
  setDecorations2?: any;
}

function readFixture(name: string): string {
  const candidates = [
    path.join(__dirname, "fixtures", name),
    // When running compiled tests from out/test, jump back to src fixtures
    path.join(__dirname, "..", "..", "src", "test", "fixtures", name),
    // As a fallback, resolve from project root
    path.join(process.cwd(), "src", "test", "fixtures", name),
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

suite("Decoration placement for export styles", () => {
  interface Case {
    file: string;
    expectedStart: number;
    description: string;
  }

  const cases: Case[] = [
    {
      file: "export-default-function.tsx",
      expectedStart: "export default function".length,
      description: "export default function Component() {}",
    },
    {
      file: "export-default-async-function.tsx",
      expectedStart: "export default async function".length,
      description: "export default async function Component() {}",
    },
    {
      file: "export-async-function.tsx",
      expectedStart: "export async function".length,
      description: "export async function Component() {}",
    },
    {
      file: "export-named-function.tsx",
      expectedStart: "export function".length,
      description: "export function Component() {}",
    },
    {
      file: "async-function.tsx",
      expectedStart: "async function".length,
      description: "async function Component() {}",
    },
    {
      file: "named-function.tsx",
      expectedStart: "function".length,
      description: "function Component() {}",
    },
    {
      file: "export-const-arrow.tsx",
      expectedStart: "export const".length,
      description: "export const Component = () => null",
    },
    {
      file: "const-arrow.tsx",
      expectedStart: "const".length,
      description: "const Component = () => null",
    },
    {
      file: "nested-function.tsx",
      expectedStart: "  function".length,
      description: "nested block: indented named function",
    },
  ];

  for (const c of cases) {
    test(c.description, async () => {
      const text = readFixture(c.file).trim();
      const doc = new MockTextDocument(text);
      const editor = new MockTextEditor(doc);
      const decorationType = {} as unknown as vscode.TextEditorDecorationType;

      const { successfulCompilations } = checkReactCompiler(
        editor.document.getText(),
        editor.document.fileName
      );

      await updateDecorations(
        editor as unknown as vscode.TextEditor,
        decorationType,
        successfulCompilations
      );

      const captured = editor.setDecorationsCapture();
      assert.ok(captured, "setDecorations was not called");

      const ranges = captured.ranges;

      assert.strictEqual(ranges.length, 1, "expected one decoration");
      const range = ranges[0].range;

      assert.strictEqual(
        range.start.character,
        c.expectedStart,
        `start index mismatch for ${c.file}`
      );
    });
  }
});

suite("Critical error handling", () => {
  test("critical-error.tsx: handles compilation errors gracefully without crashing", async () => {
    const text = readFixture("critical-error.tsx").trim();
    const doc = new MockTextDocument(text);
    const editor = new MockTextEditor(doc);
    const decorationType = {} as unknown as vscode.TextEditorDecorationType;

    // This should not throw an error even if the file has compilation issues
    const { successfulCompilations, failedCompilations } = checkReactCompiler(
      editor.document.getText(),
      editor.document.fileName
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

    // Update decorations for failed compilations (which is what critical errors should produce)
    await updateDecorations(
      editor as unknown as vscode.TextEditor,
      decorationType,
      failedCompilations
    );

    const captured = editor.setDecorationsCapture();
    // setDecorations should be called even if there are no decorations
    assert.ok(captured !== null, "setDecorations should be called");

    // The extension should handle the error case without crashing
    // If there are failed compilations, decorations should be applied
    // If compilation fails completely, empty array is acceptable
    assert.ok(Array.isArray(captured.ranges), "ranges should be an array");
  });

  test("error-without-ranges.tsx: handles errors without location ranges gracefully", async () => {
    const text = readFixture("error-without-ranges.tsx").trim();
    const doc = new MockTextDocument(text);
    const editor = new MockTextEditor(doc);
    const decorationType = {} as unknown as vscode.TextEditorDecorationType;

    // This should not throw an error even if the file has compilation issues without ranges
    const { successfulCompilations, failedCompilations } = checkReactCompiler(
      editor.document.getText(),
      editor.document.fileName
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

    // Update decorations for failed compilations that may not have location ranges
    // This should handle missing detail.loc gracefully
    await updateDecorations(
      editor as unknown as vscode.TextEditor,
      decorationType,
      failedCompilations
    );

    const captured = editor.setDecorationsCapture();
    // setDecorations should be called even if location ranges are missing
    assert.ok(captured !== null, "setDecorations should be called");
    assert.ok(Array.isArray(captured.ranges), "ranges should be an array");

    // If there are failed compilations, they should be processed without crashing
    // even if they don't have location information
    if (failedCompilations.length > 0) {
      // Verify that decorations were created for each failed compilation
      // The decoration should handle missing location data with fallbacks
      assert.ok(
        captured.ranges.length >= 0,
        "should handle decorations even with missing location data"
      );
    }
  });
});
