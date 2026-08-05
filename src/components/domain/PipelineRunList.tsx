"use client";
// VIEW LAYER — selectable list of pipeline runs for a branch.
import type { PipelineRun } from "@/models/types";
import { PipelineStatusPill, cn } from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";

export function PipelineRunList({
  runs,
  selectedRunId,
  onSelect,
  maxPoints,
}: Readonly<{
  runs: PipelineRun[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
  /**
   * What one repository is marked out of, for the score's denominator.
   *
   * `run.score` is a POINT total — `earned`, scaled to this ceiling by the
   * scoring endpoint — and it was rendered as "35%". On a 100-point project the
   * two coincide, which is why it survived; on a 50-point project 35 of 50 was
   * displayed as "35%" when the run scored 70%, and on a SPLIT project each half
   * is marked out of half the total. Optional so a caller without the assignment
   * to hand degrades to a bare number rather than to a wrong percentage.
   */
  maxPoints?: number;
}>) {
  if (runs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--border-subtle)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
        No pipeline runs on this branch yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {runs.map((run) => {
        const active = run.id === selectedRunId;
        return (
          <li key={run.id}>
            <button
              onClick={() => onSelect(run.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
                active
                  ? "border-platform/50 bg-platform-50"
                  : "border-[var(--border-subtle)] bg-white hover:bg-slate-50",
              )}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-[var(--text-strong)]">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                    {run.commitSha}
                  </code>
                  <span className="truncate text-[var(--text-muted)]">{run.branch}</span>
                </p>
                {run.commitMessage && (
                  <p className="mt-1 text-xs text-[var(--text-strong)] truncate max-w-[220px]" title={run.commitMessage}>
                    {run.commitMessage}
                  </p>
                )}
                {/*
                  The counts appear only when there ARE counts. Stage ⑦ reports
                  per-stage points and no test totals, so every real run stores
                  0/0 — and this line rendered "0/0 tests" beneath a passing run,
                  which reads as "none of your tests ran". The same rule the stage
                  breakdown already applies to "0/0 pts", for the same reason:
                  saying nothing beats a truthful number that means nothing.
                */}
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {formatDateTime(run.startedAt)}
                  {run.totalTests > 0 && (
                    <>
                      {" · "}
                      <span className="tabular-nums">
                        {run.passedTests}/{run.totalTests} tests
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {run.score !== null && (
                  <span
                    className="text-sm font-semibold tabular-nums text-[var(--text-strong)]"
                    title="The pipeline's own score for this run. Not the recorded mark."
                  >
                    {maxPoints ? `${run.score}/${maxPoints}` : run.score}
                  </span>
                )}
                <PipelineStatusPill status={run.status} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
