"use client";
// ============================================================================
// VIEW LAYER — Runs explorer
// Branch toggle + pipeline run list + selected run's 5-stage breakdown.
// Shared by teacher (audience="teacher") and student (audience="student").
// Pure presentational: receives branch/run state from useRepositoryDetail.
// ============================================================================
import { useEffect, useState } from "react";
import type { PipelineRun, RepoBranch } from "@/models/types";
import { Button, Card } from "@/components/ui";
import { BranchToggle } from "./BranchToggle";
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
}: {
  branches: RepoBranch[];
  selectedBranch: string | null;
  onSelectBranch: (name: string) => void;
  runs: PipelineRun[];
  audience: "student" | "teacher";
  onTriggerRun?: () => void;
  isTriggering?: boolean;
}) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

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
          branches={branches}
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
        <Card className="p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            5-stage breakdown
          </p>
          <PipelineStages runId={effectiveRunId} audience={audience} />
        </Card>
      </div>
    </div>
  );
}
