"use client";
// ============================================================================
// VIEWMODEL LAYER — Repository detail + workspace
// Shared by the teacher grading view and the student workspace. Owns:
//   - loading RepositoryDetail
//   - branch selection state
//   - runs filtered to the selected branch + the latest run
//   - triggering a new pipeline run (mock)
//
// It used to own "request a short-lived lab token" as well. That went with the
// LabTokenPanel it fed: handing a student a raw `ghs_` credential to paste into a
// shell was a worse version of what the VS Code handoff does invisibly. The
// server route still exists as an operator escape hatch
// (POST /repositories/:id/lab-token, see the backend README) — nothing in the UI
// calls it.
// ============================================================================
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { PipelineRun, RepositoryDetail } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface RepositoryDetailVM {
  data: RepositoryDetail | undefined;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  // branch selection
  branchNames: string[];
  selectedBranch: string | null;
  selectBranch: (name: string) => void;

  // derived run views
  runsForBranch: PipelineRun[];
  latestRun: PipelineRun | null;

  // actions
  triggerRun: () => void;
  isTriggeringRun: boolean;
}

export function useRepositoryDetail(repoId: string | null): RepositoryDetailVM {
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.repositories.detail(repoId ?? "none"),
    queryFn: () => repositoriesApi.get(repoId as string),
    enabled: Boolean(repoId),
  });

  const branchNames = useMemo(
    () => query.data?.branches.map((b) => b.name) ?? [],
    [query.data],
  );

  // Default selection sentinel: null means "not yet chosen" → fall back to
  // first branch (or the run's branch) without forcing a state update in render.
  const effectiveBranch =
    selectedBranch ??
    query.data?.branches[0]?.name ??
    query.data?.runs[0]?.branch ??
    null;

  const runsForBranch = useMemo(() => {
    const runs = query.data?.runs ?? [];
    if (!effectiveBranch) return runs;
    const filtered = runs.filter((r) => r.branch === effectiveBranch);
    return filtered.length > 0 ? filtered : runs;
  }, [query.data, effectiveBranch]);

  const latestRun = runsForBranch[0] ?? null;

  const triggerMutation = useMutation({
    mutationFn: () => repositoriesApi.triggerRun(repoId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.repositories.detail(repoId ?? "none"),
      });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),

    branchNames,
    selectedBranch: effectiveBranch,
    selectBranch: setSelectedBranch,

    runsForBranch,
    latestRun,

    triggerRun: () => triggerMutation.mutate(),
    isTriggeringRun: triggerMutation.isPending,
  };
}
