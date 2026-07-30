"use client";
// ============================================================================
// VIEW LAYER — the diff of one pull request
//
// A pull request you cannot read the diff of is not a code review. Students have
// no GitHub account, so for a teammate reviewing a group submission this is the
// ONLY place the change can be seen — and for a teacher it removes the trip to a
// site the student cannot visit.
//
// Renders GitHub's unified patch as-is rather than reconstructing a side-by-side
// view. The patch already carries hunk headers and +/- prefixes; parsing it into
// two columns means re-deriving line numbers per side, and getting that subtly
// wrong on a review surface is worse than a faithful single column.
// ============================================================================
import { useQuery } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { PullRequestFile } from "@/models/types";
import { queryKeys } from "@/viewmodels/queryKeys";
import { toPresentableError } from "@/viewmodels/errors";
import { Banner, Skeleton, StateBoundary, cn } from "@/components/ui";

export function PullRequestDiff({
  repoId,
  number,
}: {
  repoId: string;
  number: number;
}) {
  const query = useQuery({
    queryKey: queryKeys.repositories.pullRequestFiles(repoId, number),
    queryFn: () => repositoriesApi.pullRequestFiles(repoId, number),
  });

  return (
    <StateBoundary
      isLoading={query.isLoading}
      error={query.error ? toPresentableError(query.error) : null}
      isEmpty={query.data?.length === 0}
      emptyFallback={
        <Banner tone="info">
          This pull request changes no files — the branch has nothing the target
          does not already have.
        </Banner>
      }
      loadingFallback={<Skeleton className="h-32 w-full" />}
    >
      <div className="space-y-3">
        {(query.data ?? []).map((file) => (
          <FileDiff key={file.filename} file={file} />
        ))}
      </div>
    </StateBoundary>
  );
}

function FileDiff({ file }: { file: PullRequestFile }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-slate-50/60 px-3 py-2">
        <span className="truncate font-mono text-xs font-medium text-[var(--text-strong)]">
          {file.filename}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
          <span className="text-emerald-700">+{file.additions}</span>
          <span className="text-rose-700">−{file.deletions}</span>
          <span className="rounded bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border-subtle)]">
            {file.status}
          </span>
        </span>
      </div>

      {file.patch === null ? (
        <p className="px-3 py-3 text-xs text-[var(--text-muted)]">
          No text diff available — this file is binary, or the change is too large
          for GitHub to render inline.
        </p>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <tbody>
              {file.patch.split("\n").map((line, idx) => (
                <tr key={idx} className={diffRowClass(line)}>
                  <td className="whitespace-pre px-3 py-0.5">{line || " "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Colour by the patch's first character.
 *
 * `@@` is checked BEFORE `-`, because a hunk header can begin with neither and a
 * removal line and a `---` file header both start with a dash. Ordering the
 * checks this way is what keeps headers from being painted as deletions.
 */
function diffRowClass(line: string): string {
  if (line.startsWith("@@")) {
    return "bg-platform-50 text-platform-800";
  }
  if (line.startsWith("+")) {
    return cn("bg-emerald-50 text-emerald-900");
  }
  if (line.startsWith("-")) {
    return cn("bg-rose-50 text-rose-900");
  }
  return "text-[var(--text-strong)]";
}
