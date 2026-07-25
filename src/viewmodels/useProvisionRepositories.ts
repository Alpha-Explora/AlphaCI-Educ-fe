"use client";
// ============================================================================
// VIEWMODEL LAYER — Provision student repositories (teacher action)
// Wraps POST /assignments/:id/provision-repositories. On success it invalidates
// the assignment's repositories plus the teacher/class queries so roster and
// repo counts refresh, and reports the `live` flag to the global GitHub-mode
// store. Exposes a presentable result summary + reset.
// ============================================================================
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi } from "@/models/api";
import type {
  AssignmentRepository,
  ProvisionResult,
  RepoOwnerMode,
  RepoScaffold,
} from "@/models/types";
import { queryKeys } from "./queryKeys";
import { reportGithubLive } from "./useGithubMode";
import { toPresentableError, type PresentableError } from "./errors";

export interface ProvisionSummary {
  created: number;
  skipped: number;
  live: boolean;
  // ADDENDUM B — real repos + CI/CD scaffold when a teacher is GitHub-authed.
  repos: AssignmentRepository[];
  defaultBranch: string | null;
  scaffold: RepoScaffold | null;
  // ADDENDUM D — where the repos landed
  ownerLogin: string | null;
  ownerMode: RepoOwnerMode | null;
  ownerFallback: boolean;
}

export interface ProvisionRepositoriesVM {
  provision: () => void;
  isProvisioning: boolean;
  error: PresentableError | null;
  summary: ProvisionSummary | null;
  reset: () => void;
}

export function useProvisionRepositories(
  assignmentId: string | null,
): ProvisionRepositoriesVM {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => assignmentsApi.provisionRepositories(assignmentId as string),
    onSuccess: (result: ProvisionResult) => {
      reportGithubLive(result.live);
      // Refresh this assignment's repos + roster/dashboard-derived counts.
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.repositories(assignmentId ?? "none"),
      });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards", "teacher"] });
    },
  });

  const summary: ProvisionSummary | null = mutation.data
    ? {
        created: mutation.data.created.length,
        skipped: mutation.data.skipped,
        live: mutation.data.live,
        repos: mutation.data.created,
        defaultBranch: mutation.data.defaultBranch ?? null,
        scaffold: mutation.data.scaffold ?? null,
        ownerLogin: mutation.data.ownerLogin ?? null,
        ownerMode: mutation.data.ownerMode ?? null,
        ownerFallback: mutation.data.ownerFallback ?? false,
      }
    : null;

  return {
    provision: () => mutation.mutate(),
    isProvisioning: mutation.isPending,
    error: mutation.error ? toPresentableError(mutation.error) : null,
    summary,
    reset: () => mutation.reset(),
  };
}
