import * as assert from "assert";
import * as path from "path";

/* eslint-disable @typescript-eslint/no-require-imports */
const serverOut = path.join(__dirname, "..", "..", "..", "server", "out");
const { debounce } = require(path.join(serverOut, "debounce"));
const { clipHintsToRange } = require(path.join(serverOut, "inlayHints"));
/* eslint-enable @typescript-eslint/no-require-imports */

const DELAY_MS = 10;

function hintAt(line: number, character: number) {
  return { position: { line, character }, label: "✨ " };
}

function range(startLine: number, startChar: number, endLine: number, endChar: number) {
  return {
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar },
  };
}

// A client that asks for a sub-range discards anything outside it, so hints
// computed for the whole document have to be clipped before they are returned.
suite("Inlay hints: clipping to the requested range", () => {
  const hints = [hintAt(0, 5), hintAt(20, 0), hintAt(50, 0)];

  test("keeps only the hints inside the range", () => {
    assert.deepStrictEqual(clipHintsToRange(hints, range(0, 0, 50, 0)), [
      hintAt(0, 5),
      hintAt(20, 0),
    ]);
  });

  test("the range end is exclusive, so a boundary hint belongs to the next chunk", () => {
    assert.deepStrictEqual(clipHintsToRange(hints, range(50, 0, 100, 0)), [hintAt(50, 0)]);
  });

  test("the range start is inclusive", () => {
    assert.deepStrictEqual(clipHintsToRange([hintAt(10, 4)], range(10, 4, 20, 0)), [hintAt(10, 4)]);
    assert.deepStrictEqual(clipHintsToRange([hintAt(10, 3)], range(10, 4, 20, 0)), []);
  });

  test("returns everything when the client names no range", () => {
    assert.deepStrictEqual(clipHintsToRange(hints, undefined), hints);
  });
});

// Zed requests hints in ~50-row chunks, so one file produces a burst of
// near-simultaneous requests. Cancelling all but the last leaves most of the
// file unmarked. Diagnosed by Isaac Hinman
// (isaachinman/zed-react-compiler-marker).
suite("Inlay hints: debouncing a burst of requests", () => {
  test("every caller in a burst receives the result", async () => {
    let runs = 0;
    const compute = () => {
      runs++;
      return ["hints"];
    };

    const results = await Promise.all([
      debounce("file:///burst.tsx", compute, DELAY_MS),
      debounce("file:///burst.tsx", compute, DELAY_MS),
      debounce("file:///burst.tsx", compute, DELAY_MS),
    ]);

    assert.deepStrictEqual(results, [["hints"], ["hints"], ["hints"]]);
    assert.strictEqual(runs, 1, "the burst must share one computation");
  });

  test("the newest call supplies the computation", async () => {
    const [first, second] = await Promise.all([
      debounce("file:///newest.tsx", () => "stale", DELAY_MS),
      debounce("file:///newest.tsx", () => "fresh", DELAY_MS),
    ]);

    assert.strictEqual(first, "fresh", "an earlier caller still sees the newest document");
    assert.strictEqual(second, "fresh");
  });

  test("different documents do not share a computation", async () => {
    const [a, b] = await Promise.all([
      debounce("file:///a.tsx", () => "a", DELAY_MS),
      debounce("file:///b.tsx", () => "b", DELAY_MS),
    ]);

    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
  });

  test("a failing computation resolves null instead of rejecting", async () => {
    const result = await debounce(
      "file:///throws.tsx",
      () => {
        throw new Error("boom");
      },
      DELAY_MS
    );

    assert.strictEqual(result, null);
  });

  test("a later request starts a fresh computation", async () => {
    const first = await debounce("file:///sequential.tsx", () => "first", DELAY_MS);
    const second = await debounce("file:///sequential.tsx", () => "second", DELAY_MS);

    assert.strictEqual(first, "first");
    assert.strictEqual(second, "second");
  });
});
