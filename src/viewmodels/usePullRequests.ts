"use client";
// ============================================================================
// VIEWMODEL LAYER — Pull requests for one repository
//
// The submit → review → merge loop, without GitHub's UI. `main` and `uat` refuse
// direct pushes and students have no GitHub account, so these mutations are the
// only route from a pushed branch to a merged one.
//
// Every mutation invalidates the runs and repository queries as well as the pull
// request list: a merge moves `main`, which changes the branch list and can
// trigger a new pipeline run, so refetching only the pull requests would leave
// the rest of the page describing the state before the merge.
// ============================================================================
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { PullRequestView } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface PullRequestsVM {
  pullRequests: PullRequestView[];
  /** The one a student is most likely acting on: newest still open. */
  active: PullRequestView | null;
  isLoading: boolean;
  error: PresentableError | null;
  open: (input: { head: string; base: string; title?: string }) => void;
  isOpening: boolean;
  approve: (number: number) => void;
  isApproving: boolean;
  merge: (input: { number: number; override?: boolean; reason?: string }) => void;
  isMerging: boolean;
  /** Result of the last merge attempt — a refusal is a 200, not an error. */
  lastMergeMessage: string | null;
  actionError: PresentableError | null;
}

export function usePullRequests(repoId: string | null): PullRequestsVM {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.repositories.pullRequests(repoId ?? "none"),
    queryFn: () => repositoriesApi.pullRequests(repoId as string),
    enabled: Boolean(repoId),
  });

  const invalidate = async () => {
    if (!repoId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.pullRequests(repoId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.detail(repoId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.runs(repoId) }),
    ]);
  };

  const openMutation = useMutation({
    mutationFn: (input: { head: string; base: string; title?: string }) =>
      repositoriesApi.openPullRequest(repoId as string, input),
    onSuccess: invalidate,
  });

  const approveMutation = useMutation({
    mutationFn: (number: number) => repositoriesApi.approvePullRequest(repoId as string, number),
    onSuccess: invalidate,
  });

  const mergeMutation = useMutation({
    mutationFn: (input: { number: number; override?: boolean; reason?: string }) =>
      repositoriesApi.mergePullRequest(repoId as string, input.number, {
        override: input.override,
        reason: input.reason,
      }),
    onSuccess: invalidate,
  });

  const pullRequests = useMemo(() => query.data ?? [], [query.data]);

  const active = useMemo(
    () => pullRequests.find((pr) => pr.state === "open") ?? null,
    [pullRequests],
  );

  return {
    pullRequests,
    active,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    open: openMutation.mutate,
    isOpening: openMutation.isPending,
    approve: approveMutation.mutate,
    isApproving: approveMutation.isPending,
    merge: mergeMutation.mutate,
    isMerging: mergeMutation.isPending,
    // A blocked merge returns `merged: false` with a reason, NOT an error — the
    // request succeeded, the policy declined. Surfacing it as an error would
    // read to the student as "something broke" rather than "here is what to fix".
    lastMergeMessage: mergeMutation.data
      ? mergeMutation.data.message
      : null,
    actionError:
      [openMutation.error, approveMutation.error, mergeMutation.error]
        .filter(Boolean)
        .map((e) => toPresentableError(e))[0] ?? null,
  };
}
