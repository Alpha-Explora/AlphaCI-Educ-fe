// pointsPerRepo — the denominator a student is marked against.
//
// This guards a defect that reached users: a SPLIT project (backend + frontend)
// has TWO repositories, and grading each one out of `assignment.points` marked
// the student out of double the assignment's worth. The symptom reported was
// "grades are overlapping if there are backend and frontend".
import { describe, expect, it } from "vitest";
import { pointsPerRepo, repoCountFor } from "./points";

describe("repoCountFor", () => {
  it("counts two repositories for a SPLIT project", () => {
    expect(repoCountFor({ repoStructure: "SPLIT" })).toBe(2);
  });

  it("counts one for anything else", () => {
    expect(repoCountFor({ repoStructure: "SINGLE" })).toBe(1);
    // An assignment created before repoStructure existed has no value at all,
    // and must not silently become a two-repo project.
    expect(repoCountFor({ repoStructure: undefined } as never)).toBe(1);
  });
});

describe("pointsPerRepo", () => {
  it("splits the assignment's points across both repositories", () => {
    expect(pointsPerRepo({ points: 100, repoStructure: "SPLIT" })).toBe(50);
  });

  it("gives a single-repo project the whole allocation", () => {
    expect(pointsPerRepo({ points: 100, repoStructure: "SINGLE" })).toBe(100);
  });

  // Floored, to match the server exactly. Grades are integers end to end — the
  // DTO is @IsInt and the column is Int — so a fractional maximum would be both
  // unreachable and unstorable, and "37.5" beside an integer mark looks broken.
  it("floors an odd allocation rather than producing a fraction", () => {
    expect(pointsPerRepo({ points: 75, repoStructure: "SPLIT" })).toBe(37);
    expect(Number.isInteger(pointsPerRepo({ points: 75, repoStructure: "SPLIT" }))).toBe(true);
  });

  // THE INVARIANT. Whatever the structure, the parts must never be able to
  // exceed the whole — that is precisely what the overlapping-grades bug did.
  it("never lets the repositories together exceed the assignment total", () => {
    for (const points of [1, 7, 50, 75, 99, 100, 101]) {
      for (const repoStructure of ["SINGLE", "SPLIT"] as const) {
        const assignment = { points, repoStructure };
        const total = pointsPerRepo(assignment) * repoCountFor(assignment);
        expect(total).toBeLessThanOrEqual(points);
      }
    }
  });
});
