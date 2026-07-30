"use client";
// VIEWMODEL LAYER — the jobs and steps of ONE Actions workflow run.
//
// Loaded on demand: `enabled` is false until the student opens that run, which
// is what keeps a page listing ten runs down to one activity request instead of
// eleven. React Query caches per run, so re-opening a run a student already
// looked at costs nothing.
import { useQuery } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { GithubRunJobs } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

// Matches the activity poll. A run that is still going is the one case where
// the steps underneath it are changing while someone watches them.
const POLL_MS = 15_000;

export interface WorkflowRunJobsVM {
  data: GithubRunJobs | undefined;
  isLoading: boolean;
  error: PresentableError | null;
}

export function useWorkflowRunJobs(
  repoId: string,
  runId: number,
  opts: { enabled: boolean; isRunning: boolean },
): WorkflowRunJobsVM {
  const query = useQuery({
    queryKey: queryKeys.repositories.workflowRunJobs(repoId, runId),
    queryFn: () => repositoriesApi.workflowRunJobs(repoId, runId),
    enabled: opts.enabled,
    // A finished run is immutable — its steps will never change again, so it is
    // fetched once and then left alone however long the workspace stays open.
    refetchInterval: opts.isRunning ? POLL_MS : false,
    staleTime: opts.isRunning ? 0 : Infinity,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
  };
}
