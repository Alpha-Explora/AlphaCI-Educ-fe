// gradingGapsFor — what a teacher's project will silently fail to measure.
//
// Only `starter` is required to save a custom project, so a teacher can publish
// one with no hidden tests, no solution and no visible tests. Every one of those
// is invisible: the pipeline reports the component UNMEASURED and excludes it,
// which is correct behaviour and indistinguishable from "nothing to report"
// until the marks come back.
import { describe, expect, it } from "vitest";
import { gradingGapsFor, looksLikeTestFile } from "./customProjects";
import type { CustomProjectStackFiles } from "./types";

const files = (over: Partial<CustomProjectStackFiles> = {}): CustomProjectStackFiles => ({
  starter: [],
  solution: [],
  hiddenTests: [],
  ...over,
});
const f = (path: string) => ({ path, content: "" });
const ids = (v: CustomProjectStackFiles) => gradingGapsFor(v).map((g) => g.id).sort();

describe("gradingGapsFor", () => {
  it("names every gap on a project that is only a starter", () => {
    expect(ids(files({ starter: [f("src/thing.ts")] }))).toEqual([
      "no-hidden-tests",
      "no-solution",
      "no-visible-tests",
    ]);
  });

  it("is silent on a complete project", () => {
    expect(
      ids(
        files({
          starter: [f("src/thing.ts"), f("src/thing.spec.ts")],
          solution: [f("src/thing.ts")],
          hiddenTests: [f("thing.hidden.spec.ts")],
        }),
      ),
    ).toEqual([]);
  });

  // The one worth the most marks, and the easiest to forget — a teacher who
  // writes a starter and a solution has a project that looks finished.
  it("flags missing hidden tests even when everything else is written", () => {
    expect(
      ids(
        files({
          starter: [f("src/thing.ts"), f("src/thing.spec.ts")],
          solution: [f("src/thing.ts")],
        }),
      ),
    ).toEqual(["no-hidden-tests"]);
  });

  it("recognises a teacher's own test layout, not only ours", () => {
    for (const p of [
      "src/thing.spec.ts",
      "src/thing.test.ts",
      "__tests__/thing.test.ts",
      "spec/thing.spec.js",
      "tests/test_thing.py",
      "app/thing_test.py",
      "tests/ThingTest.php",
      "src/test/java/edu/ThingTest.java",
    ]) {
      expect(looksLikeTestFile(p), p).toBe(true);
    }
  });

  // Guards the extension rule against decaying into a substring match, which is
  // exactly how the backend's copy of this broke.
  it("does not mistake ordinary source files for tests", () => {
    for (const p of [
      "src/thing.ts",
      "src/latest.ts",
      "src/contest.ts",
      "src/Thing.php",
      "INSTRUCTIONS.md",
    ]) {
      expect(looksLikeTestFile(p), p).toBe(false);
    }
  });

  it("says nothing at all when a stack has not been started", () => {
    expect(gradingGapsFor(undefined)).toEqual([]);
  });
});
