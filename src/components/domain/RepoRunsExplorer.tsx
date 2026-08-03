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
  audience,
  onTriggerRun,
  isTriggering,
  sonarDashboardUrl,
}: {
  branches: RepoBranch[];
  selectedBranch: string | null;
  onSelectBranch: (name: string) => void;
  runs: PipelineRun[];
  audience: "student" | "teacher";
  onTriggerRun?: () => void;
  isTriggering?: boolean;
  /** This repository's SonarCloud project, when one was provisioned. */
  sonarDashboardUrl?: string;
}) {
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
          />
        </div>
        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              5-stage breakdown
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
