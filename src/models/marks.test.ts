// Reading a mark that may not be there yet.
//
// The report page shows a student their standing. The rule it is most easily
// got wrong by is that a WITHHELD mark and an UNMARKED one both arrive as
// `grade: null` — the server blanks unpublished marks before they reach the
// browser — and treating the first as a zero would invent a failing average out
// of work that may be full marks.
//
// That is a view-interpretation bug of exactly the kind no backend test can
// catch: the API is correctly returning null.
import { describe, expect, it } from "vitest";
import { markStateOf, publishedAverage, type WeightedMark } from "./marks";

const published = (grade: number, outOf = 100): WeightedMark => ({
  state: "PUBLISHED",
  grade,
  outOf,
});

describe("markStateOf", () => {
  it("reads a number as published", () => {
    expect(markStateOf({ grade: 72, status: "GRADED" })).toBe("PUBLISHED");
  });

  // THE DISTINCTION THE WHOLE MODULE EXISTS FOR. Redaction removes the grade
  // and leaves the status, so this is still answerable.
  it("separates a withheld mark from an unmarked one", () => {
    expect(markStateOf({ grade: null, status: "GRADED" })).toBe("AWAITING_RELEASE");
    expect(markStateOf({ grade: null, status: "SUBMITTED" })).toBe("UNMARKED");
    expect(markStateOf({ grade: null, status: "IN_PROGRESS" })).toBe("UNMARKED");
  });

  it("treats archived work with no mark as unmarked", () => {
    expect(markStateOf({ grade: null, status: "ARCHIVED" })).toBe("UNMARKED");
  });
});

describe("publishedAverage", () => {
  it("is null rather than zero when nothing is published", () => {
    expect(publishedAverage([])).toBeNull();
    expect(
      publishedAverage([{ state: "AWAITING_RELEASE", grade: null, outOf: 100 }]),
    ).toBeNull();
    expect(publishedAverage([{ state: "UNMARKED", grade: null, outOf: 100 }])).toBeNull();
  });

  // THE REGRESSION. A withheld 100% must not drag a published 80% down to 40%.
  it("excludes withheld marks instead of counting them as zero", () => {
    const marks: WeightedMark[] = [
      published(80),
      { state: "AWAITING_RELEASE", grade: null, outOf: 100 },
    ];

    expect(publishedAverage(marks)).toBe(80);
  });

  it("ignores unmarked work entirely", () => {
    const marks: WeightedMark[] = [
      published(50),
      { state: "UNMARKED", grade: null, outOf: 100 },
      { state: "UNMARKED", grade: null, outOf: 40 },
    ];

    expect(publishedAverage(marks)).toBe(50);
  });

  // Weighted, not a mean of percentages. Averaging the two percentages here
  // gives 55%; weighting by points gives 91%, which is the honest reading — the
  // student lost 9 points out of 110, not "half of one exercise".
  it("weights by points rather than averaging percentages", () => {
    const marks: WeightedMark[] = [published(100, 100), published(1, 10)];

    expect(publishedAverage(marks)).toBe(92);
  });

  it("halves the denominator for a split project's two repositories", () => {
    // A SPLIT project worth 100 marks each half out of 50.
    const marks: WeightedMark[] = [published(45, 50), published(35, 50)];

    expect(publishedAverage(marks)).toBe(80);
  });

  it("does not divide by zero on a project worth nothing", () => {
    expect(publishedAverage([published(0, 0)])).toBeNull();
  });
});
