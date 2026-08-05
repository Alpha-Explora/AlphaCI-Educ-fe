"use client";
// ============================================================================
// VIEW LAYER — 5-stage pipeline breakdown
// Renders the SANDBOX → LINT → PUBLIC_TESTS → HIDDEN_TESTS → SCORING stages for
// a run, with per-check human-readable hints. Consumes usePipelineRun; the
// `audience` prop decides whether hidden-test messages are masked (student) or
// revealed (teacher).
// ============================================================================
import { usePipelineRun } from "@/viewmodels/usePipelineRun";
import type { PipelineStage } from "@/models/types";
import {
  Banner,
  CheckStatusPill,
  Skeleton,
  StateBoundary,
  cn,
} from "@/components/ui";

const STAGE_META: Record<PipelineStage, { label: string; icon: string; blurb: string }> = {
  SANDBOX: {
    label: "Sandboxed Execution",
    icon: "📦",
    blurb: "Zero-trust isolated container",
  },
  LINT: { label: "Linting & Style", icon: "🎨", blurb: "PEP8 / style guide" },
  // The largest single component of the mark — 35%, ahead of the visible tests.
  // It had no entry, so the server's stage mapping sent it to SCORING and every
  // student and teacher read their code-quality result under the heading
  // "Partial-Credit Scoring · Rubric summary".
  QUALITY: {
    label: "Code Quality",
    icon: "🔍",
    blurb: "SonarCloud — bugs, smells, duplication",
  },
  PUBLIC_TESTS: {
    label: "Public Tests",
    icon: "🧪",
    blurb: "Visible tests to help you debug",
  },
  HIDDEN_TESTS: {
    label: "Hidden Tests",
    icon: "🔒",
    blurb: "Anti-cheating checks",
  },
  SCORING: {
    label: "Partial-Credit Scoring",
    icon: "🏅",
    blurb: "Rubric summary",
  },
};

export function PipelineStages({
  runId,
  audience,
}: {
  runId: string | null;
  audience: "student" | "teacher";
}) {
  const { stageGroups, isLoading, error } = usePipelineRun(runId, audience);

  return (
    <StateBoundary
      isLoading={isLoading}
      error={error}
      isEmpty={stageGroups.length === 0}
      emptyFallback={
        <Banner tone="info">No pipeline checks recorded for this run.</Banner>
      }
      loadingFallback={
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      }
    >
      <ol className="space-y-3">
        {stageGroups.map((group, idx) => {
          const meta = STAGE_META[group.stage];
          const tone = group.hasFailure
            ? "border-l-danger"
            : group.hasWarning
              ? "border-l-warning"
              : "border-l-success";
          return (
            <li
              key={group.stage}
              className={cn(
                "overflow-hidden rounded-lg border border-[var(--border-subtle)] border-l-4 bg-white animate-fade-up",
                tone,
              )}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-slate-50/60 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="text-lg">
                    {meta.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-strong)]">
                      {meta.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{meta.blurb}</p>
                  </div>
                </div>
                {/* Shown only when there is a mark to show.
                    `pointsPossible === 0` covers both cases that produce it, and
                    both used to render the same meaningless "0/0 pts": the server
                    withholding the arithmetic until the teacher publishes grades,
                    and a stage the pipeline genuinely awarded no points for. A
                    student staring at "0/0 pts" on every stage reads it as having
                    scored nothing, which is a worse lie than saying nothing. */}
                {group.pointsPossible > 0 && (
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border-subtle)]">
                    {group.pointsAwarded}/{group.pointsPossible} pts
                  </span>
                )}
              </div>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {group.checks.map((check) => (
                  <li
                    key={check.id}
                    className="flex items-start justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-[var(--text-strong)]">
                        {check.name}
                        {check.isHidden && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                            Hidden
                          </span>
                        )}
                      </p>
                      {check.message && (
                        <p
                          className={cn(
                            "mt-0.5 text-xs",
                            check.status === "FAIL"
                              ? "text-danger"
                              : check.status === "WARN"
                                ? "text-amber-600"
                                : "text-[var(--text-muted)]",
                          )}
                        >
                          {check.message}
                        </p>
                      )}
                    </div>
                    <CheckStatusPill status={check.status} />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </StateBoundary>
  );
}
