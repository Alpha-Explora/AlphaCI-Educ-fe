// ============================================================================
// MODEL LAYER — reading a unified patch.
//
// GitHub returns each changed file as a UNIFIED patch: hunk headers, then lines
// prefixed `+`, `-` or a space. That is enough to render a single column as-is,
// which is what the diff view did — and it is not enough to review with. Two
// things were missing and both are load-bearing:
//
//   LINE NUMBERS. "It broke on line 42" is the sentence a teacher says to a
//   student. A patch carries the numbers only inside its hunk headers, so a
//   reader had to count rows by hand to name a line.
//
//   TWO COLUMNS. "Compare the branches" means seeing what a line WAS beside what
//   it BECAME. In one column a replacement is two rows several lines apart once
//   a block of deletions precedes a block of additions.
//
// The old comment on PullRequestDiff argued against side-by-side, on the grounds
// that re-deriving per-side line numbers is easy to get subtly wrong and being
// wrong on a review surface is worse than a faithful single column. That caution
// is right, and it is an argument for testing the derivation rather than for not
// doing it — so the arithmetic lives HERE, as pure functions over a string, and
// the view renders whatever comes back.
//
// WHY THIS IS NOT IN THE COMPONENT
// Parsing in the render path means the only way to check it is to look at a
// screen and believe what you see. A pure function over a patch can be run
// against a real one and its output compared line by line, which is how the
// off-by-one this file exists to avoid gets caught.
// ============================================================================

/** `@@ -oldStart,oldCount +newStart,newCount @@ optional heading` */
const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export type UnifiedRowKind = "context" | "add" | "del" | "hunk" | "meta";

export interface UnifiedRow {
  kind: UnifiedRowKind;
  /** The line's content, with its `+`/`-`/space marker already stripped. */
  text: string;
  /** 1-based line number on the BASE side, or null when the line is an addition. */
  oldNo: number | null;
  /** 1-based line number on the HEAD side, or null when the line is a deletion. */
  newNo: number | null;
}

export interface SplitCell {
  no: number | null;
  text: string;
  /** `empty` pads the shorter side of an uneven change block. */
  kind: "context" | "add" | "del" | "empty";
}

export interface SplitRow {
  kind: "context" | "change" | "hunk" | "meta";
  /** Set for `hunk` and `meta` rows, which span both columns. */
  text?: string;
  left?: SplitCell;
  right?: SplitCell;
}

/**
 * One row per line of the patch, each carrying the line numbers it occupies.
 *
 * Counters are seeded from the hunk header rather than accumulated from the top
 * of the file: a patch contains only the changed neighbourhoods, so the second
 * hunk does not start where the first one ended. Reading the header is the ONLY
 * way to know where a hunk sits, which is exactly the arithmetic that has to be
 * right.
 */
export function parseUnifiedPatch(patch: string): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  let oldNo = 0;
  let newNo = 0;

  for (const raw of patch.split("\n")) {
    const hunk = HUNK.exec(raw);
    if (hunk) {
      oldNo = Number(hunk[1]);
      newNo = Number(hunk[2]);
      rows.push({ kind: "hunk", text: raw, oldNo: null, newNo: null });
      continue;
    }

    // `\ No newline at end of file` is a NOTE about the previous line, not a
    // line of either file. Counting it would shift every number after it.
    if (raw.startsWith("\\")) {
      rows.push({ kind: "meta", text: raw, oldNo: null, newNo: null });
      continue;
    }

    const marker = raw[0];
    if (marker === "+") {
      rows.push({ kind: "add", text: raw.slice(1), oldNo: null, newNo: newNo++ });
    } else if (marker === "-") {
      rows.push({ kind: "del", text: raw.slice(1), oldNo: oldNo++, newNo: null });
    } else {
      // A context line is " text". An UNCHANGED BLANK line arrives as a bare
      // "" from some producers rather than as a single space, and `"".slice(1)`
      // is "" either way — but the marker check has to fall through to here for
      // it, which is why this branch is the default rather than a `=== " "`.
      rows.push({
        kind: "context",
        text: raw === "" ? "" : raw.slice(1),
        oldNo: oldNo++,
        newNo: newNo++,
      });
    }
  }

  return rows;
}

/**
 * The same rows paired into two columns.
 *
 * A replacement in a unified patch is every removed line followed by every added
 * line, so pairing means consuming a whole `-` run and a whole `+` run and
 * zipping them. Pairing line-by-line as they arrive would put the first removal
 * opposite the second addition whenever the runs are uneven, which is the
 * "subtly wrong" this is written to avoid.
 *
 * Uneven runs pad with `empty` on the shorter side, so a pure insertion has a
 * blank left column and a pure deletion a blank right one.
 */
export function toSplitRows(rows: readonly UnifiedRow[]): SplitRow[] {
  const out: SplitRow[] = [];
  let i = 0;

  while (i < rows.length) {
    const row = rows[i];

    if (row.kind === "hunk" || row.kind === "meta") {
      out.push({ kind: row.kind, text: row.text });
      i += 1;
      continue;
    }

    if (row.kind === "context") {
      out.push({
        kind: "context",
        left: { no: row.oldNo, text: row.text, kind: "context" },
        right: { no: row.newNo, text: row.text, kind: "context" },
      });
      i += 1;
      continue;
    }

    // A change block: the whole `-` run, then the whole `+` run.
    const dels: UnifiedRow[] = [];
    while (i < rows.length && rows[i].kind === "del") dels.push(rows[i++]);
    const adds: UnifiedRow[] = [];
    while (i < rows.length && rows[i].kind === "add") adds.push(rows[i++]);

    const height = Math.max(dels.length, adds.length);
    for (let k = 0; k < height; k += 1) {
      const del = dels[k];
      const add = adds[k];
      out.push({
        kind: "change",
        left: del
          ? { no: del.oldNo, text: del.text, kind: "del" }
          : { no: null, text: "", kind: "empty" },
        right: add
          ? { no: add.newNo, text: add.text, kind: "add" }
          : { no: null, text: "", kind: "empty" },
      });
    }
  }

  return out;
}

/**
 * The widest line number in the patch, for sizing the gutter.
 *
 * Measured rather than guessed at a fixed width: a three-digit gutter on a
 * four-digit file either clips the number or scrolls the row, and both are worse
 * than a gutter that is occasionally a character wider than it needs to be.
 */
export function gutterWidth(rows: readonly UnifiedRow[]): number {
  let widest = 0;
  for (const row of rows) {
    widest = Math.max(widest, row.oldNo ?? 0, row.newNo ?? 0);
  }
  return String(Math.max(widest, 1)).length;
}
