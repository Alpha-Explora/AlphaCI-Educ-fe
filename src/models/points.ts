// ============================================================================
// MODEL LAYER — how many points ONE repository is worth.
//
// A deliberate mirror of the backend's common/assignment-points.util.ts. The
// server is the authority — it validates a teacher's entry and clamps the
// pipeline's score against this same rule — and this copy exists so the UI can
// LABEL and VALIDATE consistently with it rather than guessing.
//
// The two must agree. If the split ever stops being even (a teacher-set weight
// on Assignment), change the server first and then this file, and prefer sending
// the number down in the payload over keeping two implementations in step by
// hand. Until then the rule is small enough that duplicating it beats adding a
// round trip to render a label.
//
// WHAT IT FIXES HERE. Every "x/100" and every grading input used
// `assignment.points` directly, which is the PROJECT's total. On a SPLIT project
// that made a backend marked 50/50 render as "50/100" — a student reading half
// marks for full work — and it set the teacher's grade input to a maximum of 100
// on a field the server now rejects above 50.
// ============================================================================
import type { Assignment } from "./types";

/**
 * Repositories a project of this shape provisions per student or group.
 *
 * From `repoStructure`, not from counting repos: a ceiling that depended on how
 * many repositories had been provisioned so far would change under a student
 * mid-project. A missing value means SINGLE — projects created before split
 * projects existed produced exactly one repository.
 */
export function repoCountFor(assignment: Pick<Assignment, "repoStructure">): number {
  return assignment.repoStructure === "SPLIT" ? 2 : 1;
}

/**
 * The maximum mark one repository of this project may be given.
 *
 * Use this for grade denominators and for the `max` of a grading input. Using
 * `assignment.points` for either is the bug this replaces.
 */
export function pointsPerRepo(
  assignment: Pick<Assignment, "points" | "repoStructure">,
): number {
  // Floored to match the server exactly. Grades are integers end to end — the
  // DTO is @IsInt and the column is Int — so a fractional ceiling would be
  // unreachable AND unstorable, and a denominator of "37.5" beside an integer
  // mark would just look broken.
  return Math.floor(assignment.points / repoCountFor(assignment));
}
