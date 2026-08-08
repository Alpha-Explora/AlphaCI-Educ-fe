// parseUnifiedPatch / toSplitRows — the arithmetic behind the PR diff view.
//
// Line numbers are the whole product here: a diff that renders the right text
// against the wrong line number is worse than no diff, because it looks correct.
import { describe, expect, it } from "vitest";
import { gutterWidth, parseUnifiedPatch, toSplitRows } from "./diff";

// Built by hand rather than pasted: a real patch's escapes are easy to mangle
// in transit, and a fixture that is subtly wrong tests nothing.
const patch = [
  "@@ -10,4 +10,5 @@ function calc() {",
  " const a = 1;",
  "-const b = 2;",
  "-const c = 3;",
  "+const b = 20;",
  "+const c = 30;",
  "+const d = 40;",
  " return a;",
].join("\n");

describe("parseUnifiedPatch", () => {
  // Counters seed from the hunk header. Starting from 1 would be right only for
  // a patch whose first hunk happens to begin at the top of the file.
  it("seeds line numbers from the hunk header, not from 1", () => {
    const rows = parseUnifiedPatch(patch);
    const firstContext = rows.find((r) => r.kind === "context");

    expect(firstContext?.oldNo).toBe(10);
    expect(firstContext?.newNo).toBe(10);
  });

  it("advances only the side each line belongs to", () => {
    const rows = parseUnifiedPatch(patch);
    const del = rows.filter((r) => r.kind === "del");
    const add = rows.filter((r) => r.kind === "add");

    // A deletion exists only on the base side.
    expect(del.map((r) => r.oldNo)).toEqual([11, 12]);
    expect(del.every((r) => r.newNo === null)).toBe(true);

    // An addition exists only on the head side.
    expect(add.map((r) => r.newNo)).toEqual([11, 12, 13]);
    expect(add.every((r) => r.oldNo === null)).toBe(true);
  });

  // The trailing context line proves both counters survived the uneven block:
  // 2 removed and 3 added means the sides legitimately diverge from here on.
  it("keeps the two sides correct after an uneven change block", () => {
    const rows = parseUnifiedPatch(patch);
    const last = rows[rows.length - 1];

    expect(last.kind).toBe("context");
    expect(last.oldNo).toBe(13);
    expect(last.newNo).toBe(14);
  });

  // `\ No newline at end of file` is a NOTE about the previous line. Counting it
  // as a line shifts every number after it.
  it("does not count the no-newline marker as a line", () => {
    const rows = parseUnifiedPatch(
      ["@@ -1,1 +1,1 @@", "-old", String.fromCharCode(92) + " No newline at end of file", "+new"].join("\n"),
    );
    const meta = rows.find((r) => r.kind === "meta");

    expect(meta).toBeTruthy();
    expect(meta?.oldNo).toBeNull();
    expect(meta?.newNo).toBeNull();
    // The addition still gets line 1 — the marker consumed no number.
    expect(rows.find((r) => r.kind === "add")?.newNo).toBe(1);
  });

  // Some producers emit an unchanged blank line as "" rather than " ".
  it("treats a bare empty line as unchanged context", () => {
    const rows = parseUnifiedPatch(["@@ -1,2 +1,2 @@", " a", "", " b"].join("\n"));
    const blank = rows[2];

    expect(blank.kind).toBe("context");
    expect(blank.text).toBe("");
    expect(blank.oldNo).toBe(2);
  });
});

describe("toSplitRows", () => {
  // THE BUG THIS FUNCTION EXISTS TO AVOID: pairing line-by-line as they arrive
  // puts the first removal opposite the second addition once the runs differ in
  // length. Both sides must stay with their own run.
  it("zips a whole removal run against a whole addition run", () => {
    const split = toSplitRows(parseUnifiedPatch(patch));
    const changes = split.filter((r) => r.kind === "change");

    expect(changes[0].left?.text).toBe("const b = 2;");
    expect(changes[0].right?.text).toBe("const b = 20;");
    expect(changes[1].left?.text).toBe("const c = 3;");
    expect(changes[1].right?.text).toBe("const c = 30;");
  });

  it("pads the shorter side of an uneven block", () => {
    const split = toSplitRows(parseUnifiedPatch(patch));
    const changes = split.filter((r) => r.kind === "change");

    // Three additions against two removals: the third has nothing on the left.
    expect(changes).toHaveLength(3);
    expect(changes[2].left?.kind).toBe("empty");
    expect(changes[2].right?.text).toBe("const d = 40;");
  });

  it("gives a pure insertion an empty left column", () => {
    const split = toSplitRows(parseUnifiedPatch(["@@ -5,1 +5,2 @@", " keep", "+added"].join("\n")));
    const change = split.find((r) => r.kind === "change");

    expect(change?.left?.kind).toBe("empty");
    expect(change?.right?.text).toBe("added");
  });

  it("gives a pure deletion an empty right column", () => {
    const split = toSplitRows(parseUnifiedPatch(["@@ -5,2 +5,1 @@", " keep", "-gone"].join("\n")));
    const change = split.find((r) => r.kind === "change");

    expect(change?.right?.kind).toBe("empty");
    expect(change?.left?.text).toBe("gone");
  });
});

describe("gutterWidth", () => {
  // The gutter has to fit the WIDEST number present, or four-digit line numbers
  // are clipped in exactly the large files where a diff matters most.
  it("widens to fit the largest line number", () => {
    const narrow = gutterWidth(parseUnifiedPatch(["@@ -1,1 +1,1 @@", " a"].join("\n")));
    const wide = gutterWidth(parseUnifiedPatch(["@@ -1000,1 +1000,1 @@", " a"].join("\n")));

    expect(wide).toBeGreaterThan(narrow);
  });
});
