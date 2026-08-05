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
import { GRADED_BRANCHES, type PipelineRun, type RepositoryDetail } from "@/models/types";
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
  /** Runs excluded by the branch filter — 0 when the selected branch has them all. */
  runsOnOtherBranches: number;
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

  // Default selection sentinel: null means "not yet chosen" → fall back without
  // forcing a state update in render.
  //
  // A GRADED branch, not `branches[0]`. GitHub returns branches alphabetically,
  // so on a repository with a `dev` branch `branches[0]` was `dev` — a branch the
  // marking view deliberately does not list. Two things followed, both silent:
  // the branch toggle rendered with NOTHING selected, since `dev` matched none of
  // the chips it draws; and the run filter below found no `dev` runs and fell
  // through to showing every run from every branch, under a toggle labelled
  // `main`. A teacher read a pull-request run as a run on main.
  //
  // GRADED_BRANCHES order is used on purpose — `main` before `uat`, the marking
  // view's order. Promotion order is the other way round and belongs to the
  // submit panel, which is choosing a destination rather than a record to read.
  const effectiveBranch =
    selectedBranch ??
    GRADED_BRANCHES.find((name) =>
      query.data?.branches.some((b) => b.name === name),
    ) ??
    query.data?.branches[0]?.name ??
    query.data?.runs[0]?.branch ??
    null;

  // STRICTLY the selected branch's runs. The old `filtered.length > 0 ? filtered
  // : runs` fallback meant "show everything" whenever a branch had no runs of its
  // own, which is indistinguishable on screen from "these are that branch's
  // runs". An empty list is the honest answer, and the list renders its own
  // "no runs on this branch yet" for it.
  const runsForBranch = useMemo(() => {
    const runs = query.data?.runs ?? [];
    if (!effectiveBranch) return runs;
    return runs.filter((r) => r.branch === effectiveBranch);
  }, [query.data, effectiveBranch]);

  // What the strict filter now hides, so the view can say so rather than leaving
  // a teacher to conclude the pipeline never ran. Pull-request runs land here:
  // the workflow reports `GITHUB_REF_NAME`, which on a `pull_request` event is
  // the synthetic `N/merge` ref and matches no branch that exists.
  const runsOnOtherBranches = useMemo(
    () => (query.data?.runs.length ?? 0) - runsForBranch.length,
    [query.data, runsForBranch],
  );

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
    runsOnOtherBranches,
    latestRun,

    triggerRun: () => triggerMutation.mutate(),
    isTriggeringRun: triggerMutation.isPending,
  };
}
