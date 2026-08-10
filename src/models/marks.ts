// ============================================================================
// MODEL LAYER — reading a mark that may not be there yet.
//
// Sits beside points.ts for the same reason: it is a rule, not a rendering, and
// the report page plus anything that later summarises a student's standing must
// answer these questions identically.
//
// ── WHY A NULL GRADE IS AMBIGUOUS ──────────────────────────────────────────
//
// The server withholds unpublished marks from students. On any assignment with
// no release stamp it blanks `repo.grade`, `teacherFeedback`, `gradedAt` and
// the matching `latestRun.score` before the payload leaves (see the backend's
// common/grade-visibility.util.ts).
//
// That makes `grade === null` mean two opposite things:
//
//   marked, and the teacher has not published it
//   nobody has marked it
//
// `status` is NOT redacted, which is the only reason these are still separable.
// A student told "marked — not published yet" knows their work is done and the
// wait is administrative. A student shown "—" for both learns nothing and
// reasonably concludes they were skipped.
// ============================================================================
import type { Assignment, AssignmentRepository } from "./types";
import { pointsPerRepo } from "./points";

export type MarkState = "PUBLISHED" | "AWAITING_RELEASE" | "UNMARKED";

/** What the absence — or presence — of a number on this repository means. */
export function markStateOf(
  repo: Pick<AssignmentRepository, "grade" | "status">,
): MarkState {
  if (repo.grade !== null) return "PUBLISHED";
  if (repo.status === "GRADED") return "AWAITING_RELEASE";
  return "UNMARKED";
}

/** A marked repository and the total it was marked out of. */
export interface WeightedMark {
  state: MarkState;
  grade: number | null;
  outOf: number;
}

/**
 * Percent across PUBLISHED marks only.
 *
 * Two decisions worth stating, because both are silently wrong the other way:
 *
 * WITHHELD MARKS ARE EXCLUDED, NOT COUNTED AS ZERO. Counting them would invent
 * a failing average out of work that may well be full marks — the single most
 * harmful thing this function could do, since the average is the first number a
 * student reads.
 *
 * WEIGHTED BY POINTS, NOT AN AVERAGE OF PERCENTAGES. A 10-point exercise and a
 * 100-point project are not equal evidence; averaging their percentages says
 * they are, and lets one small slip outweigh a whole term's work.
 *
 * Returns null rather than 0 when nothing is published: "no marks yet" and
 * "averaging zero" are opposite messages.
 */
export function publishedAverage(marks: readonly WeightedMark[]): number | null {
  const published = marks.filter((m) => m.state === "PUBLISHED" && m.grade !== null);
  if (published.length === 0) return null;

  const possible = published.reduce((sum, m) => sum + m.outOf, 0);
  if (possible === 0) return null;

  const earned = published.reduce((sum, m) => sum + (m.grade as number), 0);
  return Math.round((earned / possible) * 100);
}

/** This repository's share of its project's points — half of it on a SPLIT. */
export function markOutOf(
  assignment: Pick<Assignment, "points" | "repoStructure">,
): number {
  return pointsPerRepo(assignment);
}
