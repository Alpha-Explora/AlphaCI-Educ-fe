"use client";
// ============================================================================
// VIEWMODEL LAYER — Pipeline run detail
// Loads a run + its 5-stage checks, groups checks by stage in canonical order,
// and (for students) masks the messages of hidden tests. Teachers see all.
// ============================================================================
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { pipelineApi } from "@/models/api";
import {
  PIPELINE_STAGE_ORDER,
  type PipelineCheck,
  type PipelineRun,
  type PipelineStage,
} from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface StageGroup {
  stage: PipelineStage;
  checks: PipelineCheck[];
  pointsAwarded: number;
  pointsPossible: number;
  hasFailure: boolean;
  hasWarning: boolean;
}

const STUDENT_HIDDEN_MESSAGE =
  "Hidden test — details are masked until grading is complete.";

export interface PipelineRunVM {
  run: PipelineRun | undefined;
  checks: PipelineCheck[];
  stageGroups: StageGroup[];
  isLoading: boolean;
  error: PresentableError | null;
}

/**
 * @param runId    pipeline run id (null disables the query)
 * @param audience "student" masks hidden-test messages; "teacher" reveals them
 */
export function usePipelineRun(
  runId: string | null,
  audience: "student" | "teacher" = "teacher",
): PipelineRunVM {
  const query = useQuery({
    queryKey: queryKeys.pipelineRuns.detail(runId ?? "none"),
    queryFn: () => pipelineApi.run(runId as string),
    enabled: Boolean(runId),
  });

  const checks = useMemo<PipelineCheck[]>(() => {
    const raw = query.data?.checks ?? [];
    if (audience === "teacher") return raw;
    // Student view: mask hidden-test messages so answers can't leak.
    return raw.map((c) =>
      c.isHidden ? { ...c, message: STUDENT_HIDDEN_MESSAGE } : c,
    );
  }, [query.data, audience]);

  const stageGroups = useMemo<StageGroup[]>(() => {
    return PIPELINE_STAGE_ORDER.map((stage) => {
      const stageChecks = checks.filter((c) => c.stage === stage);
      return {
        stage,
        checks: stageChecks,
        pointsAwarded: stageChecks.reduce((s, c) => s + c.pointsAwarded, 0),
        pointsPossible: stageChecks.reduce((s, c) => s + c.pointsPossible, 0),
        hasFailure: stageChecks.some((c) => c.status === "FAIL"),
        hasWarning: stageChecks.some((c) => c.status === "WARN"),
      };
    }).filter((g) => g.checks.length > 0);
  }, [checks]);

  return {
    run: query.data?.run,
    checks,
    stageGroups,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
  };
}
