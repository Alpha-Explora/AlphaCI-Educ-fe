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
          No repositories generated for this assignment yet.
        </p>
      }
      loadingFallback={
        <div className="space-y-2 p-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      }
    >
      <ul className="divide-y divide-[var(--border-subtle)]">
        {vm.repositories.map((repo) => {
          const owner = repo.ownerUserId ? usersById[repo.ownerUserId] : null;
          const ownerName = owner?.fullName ?? "Team repository";
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
                  <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                    {repo.repoName}
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
