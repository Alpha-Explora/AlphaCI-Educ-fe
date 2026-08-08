"use client";
// ============================================================================
// VIEW LAYER — repositories under one assignment (teacher grading entry points)
// Each row links to the student's repo / grading view. Consumes
// useAssignmentRepositories; the roster provides student names for owners.
// ============================================================================
import Link from "next/link";
import { useAssignmentRepositories } from "@/viewmodels/useAssignmentRepositories";
import type { Assignment, SystemUser } from "@/models/types";
import { RepoStatusPill, Skeleton, StateBoundary, cn } from "@/components/ui";
import { formatDate } from "@/components/ui/format";
import { pointsPerRepo } from "@/models/points";

export function AssignmentSubmissions({
  assignmentId,
  assignment,
  usersById,
}: Readonly<{
  assignmentId: string;
  /**
   * The project, for the mark's denominator.
   *
   * Was a bare `points` number taken straight from the assignment, which is the
   * PROJECT total — so on a SPLIT project, where each half is worth half of it,
   * every row read "35/100" for a repository marked out of 50. `pointsPerRepo`
   * is the same rule the server validates a saved grade against.
   */
  assignment: Assignment;
  usersById: Record<string, SystemUser>;
}>) {
  const vm = useAssignmentRepositories(assignmentId);
  const maxPoints = pointsPerRepo(assignment);

  return (
    <StateBoundary
      isLoading={vm.isLoading}
      error={vm.error}
      isEmpty={vm.repositories.length === 0}
      emptyFallback={
        <p className="px-4 py-3 text-sm text-[var(--text-muted)]">
          No workspaces have been created for this project yet.
        </p>
      }
      loadingFallback={
        <div className="space-y-2 p-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      }
    >
      {/* How many rows are in the box, since a scroll area hides its own size. */}
      <p className="border-b border-[var(--border-subtle)] bg-slate-50/60 px-4 py-2 text-xs text-[var(--text-muted)]">
        {vm.repositories.length}{" "}
        {vm.repositories.length === 1 ? "submission" : "submissions"}
      </p>

      {/*
        A FIXED-HEIGHT SCROLL AREA, not a list that grows with the cohort.

        One row per student, so a class of fifty is a fifty-row list — and every
        section below it (hidden tests, marks, the project's actions) would sit
        below all fifty. The panel would be a page whose length is decided by how
        many people enrolled, which is not a property the layout should have.

        `max-h`, not `h`: a project with three submissions should not draw an
        empty box the height of a class of fifty. `overscroll-contain` keeps a
        trackpad flick inside the list once it reaches the end, rather than
        carrying on and scrolling the page out from under the teacher.
      */}
      <ul className="max-h-[26rem] divide-y divide-[var(--border-subtle)] overflow-y-auto overscroll-contain">
        {vm.repositories.map((repo) => {
          const owner = repo.ownerUserId ? usersById[repo.ownerUserId] : null;
          const ownerName = owner?.fullName ?? "Team workspace";
          return (
            <li key={repo.id}>
              <Link
                href={`/teacher/repositories/${repo.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-platform"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                    {ownerName}
                  </p>
                  {/*
                    WAS `repo.repoName`, in monospace, under every student's
                    name — "at1234-sectionb-2026-calendar-levlimit". That is the
                    hosting provider's slug, and this product keeps its hosting
                    invisible: a teacher marking work has no use for it and no
                    way to act on it. The submission state is what belongs here.
                  */}
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {repo.submittedAt
                      ? `Handed in ${formatDate(repo.submittedAt)}`
                      : "Not handed in yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      repo.grade !== null
                        ? "text-[var(--text-strong)]"
                        : "text-[var(--text-muted)]",
                    )}
                  >
                    {repo.grade !== null ? `${repo.grade}/${maxPoints}` : "—"}
                  </span>
                  <RepoStatusPill status={repo.status} />
                  <span aria-hidden="true" className="text-[var(--text-muted)]">
                    →
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </StateBoundary>
  );
}
