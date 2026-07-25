"use client";
// VIEWMODEL LAYER — ADDENDUM M: LIVE GitHub activity for a repo.
// Real branches, commits and Actions workflow runs, polled while the page is
// open so a student sees their push (and its CI result) appear without a manual
// reload. `live:false` means the server is in simulated mode — the View shows a
// notice rather than fake data.
import { useQuery } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { GithubRepoActivity } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

const POLL_MS = 15_000;

export interface RepoActivityVM {
  data: GithubRepoActivity | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: PresentableError | null;
  refetch: () => void;
}

export function useRepoActivity(
  repoId: string | null,
  branch?: string | null,
): RepoActivityVM {
  const query = useQuery({
    queryKey: queryKeys.repositories.githubActivity(repoId ?? "none", branch ?? undefined),
    queryFn: () => repositoriesApi.githubActivity(repoId as string, branch ?? undefined),
    enabled: Boolean(repoId),
    // Keeps the panel feeling "live" right after a push / while CI is running.
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}
