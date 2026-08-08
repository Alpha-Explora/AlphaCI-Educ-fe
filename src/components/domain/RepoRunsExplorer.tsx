"use client";
// ============================================================================
// VIEW LAYER — Runs explorer
// Branch toggle + pipeline run list + selected run's 5-stage breakdown.
// Shared by teacher (audience="teacher") and student (audience="student").
// Pure presentational: receives branch/run state from useRepositoryDetail.
// ============================================================================
import { useEffect, useState } from "react";
import { GRADED_BRANCHES, type PipelineRun, type RepoBranch } from "@/models/types";
import { Button, Card } from "@/components/ui";
import { BranchToggle } from "./BranchToggle";
import { CodeQualityCard } from "./CodeQualityCard";
import { PipelineRunList } from "./PipelineRunList";
import { PipelineStages } from "./PipelineStages";

export function RepoRunsExplorer({
  branches,
  selectedBranch,
  onSelectBranch,
  runs,
  runsOnOtherBranches = 0,
  audience,
  onTriggerRun,
  isTriggering,
  sonarDashboardUrl,
  maxPoints,
}: Readonly<{
  branches: RepoBranch[];
  selectedBranch: string | null;
  onSelectBranch: (name: string) => void;
  runs: PipelineRun[];
  /**
   * Runs this submission has that the branch filter excluded.
   *
   * Rendered as a note, because the filter used to give up silently and show
   * every branch's runs whenever the selected one had none — which looked
   * identical to those runs belonging to the selected branch. Saying "3 more on
   * other branches" keeps the list strict without making the rest invisible.
   */
  runsOnOtherBranches?: number;
  audience: "student" | "teacher";
  onTriggerRun?: () => void;
  isTriggering?: boolean;
  /** This repository's SonarCloud project, when one was provisioned. */
  sonarDashboardUrl?: string;
  /** What THIS repository is marked out of — the run score's denominator. */
  maxPoints?: number;
}>) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // ONLY THE GRADED BRANCHES.
  //
  // This view is the marking record, and only `main` and `uat` run the graded
  // workflow — a feature branch is where a student works, not where they are
  // assessed. Listing `feat/fahrenheit-to-celsius` beside `main` invited exactly
  // the wrong reading: that a green feature branch meant a passing project.
  //
  // Matched by NAME against the product's own protected set rather than by the
  // `protected` flag GitHub reports. The flag is a fact about branch protection
  // rules, which can be absent on a freshly provisioned repository or in
  // simulated mode — and an empty branch list would then hide the runs entirely.
  // The names are the definition (see PROTECTED_BRANCHES in the backend's
  // domain/types.ts) and they cannot go missing.
  const gradedBranches = branches.filter((b) => GRADED_BRANCHES.includes(b.name));
  // Fall back to whatever exists rather than rendering an empty toggle: a
  // repository whose default branch is named something else is a misconfiguration
  // to notice, not a reason to show a student nothing.
  const shownBranches = gradedBranches.length > 0 ? gradedBranches : branches;

  // Keep a valid selection as the branch (and thus runs) change.
  const effectiveRunId =
    selectedRunId && runs.some((r) => r.id === selectedRunId)
      ? selectedRunId
      : (runs[0]?.id ?? null);

  // Reset explicit selection when the branch's runs no longer contain it.
  useEffect(() => {
    if (selectedRunId && !runs.some((r) => r.id === selectedRunId)) {
      setSelectedRunId(null);
    }
  }, [runs, selectedRunId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BranchToggle
          branches={shownBranches}
          selected={selectedBranch}
          onSelect={onSelectBranch}
        />
        {onTriggerRun && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onTriggerRun}
            loading={isTriggering}
          >
            <span aria-hidden="true">▶</span> Run pipeline
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Pipeline runs
          </p>
          <PipelineRunList
            runs={runs}
            selectedRunId={effectiveRunId}
            onSelect={setSelectedRunId}
            maxPoints={maxPoints}
          />
          {/*
            What the branch filter left out. Pull-request runs are the usual
            reason: the workflow reports GitHub's ref name, which on a
            `pull_request` event is the synthetic `N/merge` ref rather than the
            branch, so those runs match no chip above. Without this line a strict
            filter reads as "the pipeline has not run", which is the wrong
            conclusion to leave a teacher holding.
          */}
          {runsOnOtherBranches > 0 && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {runsOnOtherBranches} more{" "}
              {runsOnOtherBranches === 1 ? "run" : "runs"} on other branches, including
              pull requests. The Actions panel above lists every run.
            </p>
          )}
        </div>
        <div className="space-y-4">
          <Card className="p-4">
            {/*
              Not "5-stage". The real pipeline has seven stages and REPORTS four
              of them — lint, code quality, public tests, hidden tests — so a
              heading promising five sat above a list of four, and the reader was
              left to guess which one was missing and whether that mattered.
            */}
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Stage breakdown
            </p>
            <PipelineStages runId={effectiveRunId} audience={audience} />
          </Card>
          {/*
            Driven by the SELECTED run's stored snapshot, so switching runs
            shows each one's own measurements rather than the project's current
            state. Renders its own empty/unmeasured states, so it is mounted
            unconditionally.
          */}
          <CodeQualityCard
            quality={runs.find((r) => r.id === effectiveRunId)?.quality}
            dashboardUrl={sonarDashboardUrl}
            audience={audience}
          />
        </div>
      </div>
    </div>
  );
}
