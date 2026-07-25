"use client";
// ============================================================================
// VIEW LAYER — repositories under one assignment (teacher grading entry points)
// Each row links to the student's repo / grading view. Consumes
// useAssignmentRepositories; the roster provides student names for owners.
// ============================================================================
import Link from "next/link";
import { useAssignmentRepositories } from "@/viewmodels/useAssignmentRepositories";
import type { SystemUser } from "@/models/types";
import { RepoStatusPill, Skeleton, StateBoundary, cn } from "@/components/ui";

export function AssignmentSubmissions({
  assignmentId,
  points,
  usersById,
}: {
  assignmentId: string;
  points: number;
  usersById: Record<string, SystemUser>;
}) {
  const vm = useAssignmentRepositories(assignmentId);

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
                    {repo.grade !== null ? `${repo.grade}/${points}` : "—"}
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
