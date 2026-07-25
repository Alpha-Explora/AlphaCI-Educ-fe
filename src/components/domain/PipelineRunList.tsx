"use client";
// VIEW LAYER — selectable list of pipeline runs for a branch.
import type { PipelineRun } from "@/models/types";
import { PipelineStatusPill, cn } from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";

export function PipelineRunList({
  runs,
  selectedRunId,
  onSelect,
}: {
  runs: PipelineRun[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}) {
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
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {formatDateTime(run.startedAt)} ·{" "}
                  <span className="tabular-nums">
                    {run.passedTests}/{run.totalTests} tests
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {run.score !== null && (
                  <span className="text-sm font-semibold tabular-nums text-[var(--text-strong)]">
                    {run.score}%
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
