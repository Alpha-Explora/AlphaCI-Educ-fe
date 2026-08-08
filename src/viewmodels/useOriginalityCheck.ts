"use client";
// ============================================================================
// VIEWMODEL LAYER — Originality check (teacher action)
// Wraps POST /assignments/:id/originality-check. On success it invalidates the
// assignment's repositories so each student's originality card re-reads its
// state — the run is what sets `comparedAt`, and without the invalidation every
// card keeps saying "not yet compared" until a manual refresh.
// ============================================================================
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi } from "@/models/api";
import type { OriginalityReport } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface OriginalityCheckVM {
  run: () => void;
  isRunning: boolean;
  error: PresentableError | null;
  report: OriginalityReport | null;
  reset: () => void;
}

export function useOriginalityCheck(assignmentId: string | null): OriginalityCheckVM {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => assignmentsApi.originalityCheck(assignmentId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.repositories(assignmentId ?? "none"),
      });
      // Repository detail holds the flags AND the integrity state the card
      // renders, so it has to be re-fetched too.
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });

  return {
    run: () => mutation.mutate(),
    isRunning: mutation.isPending,
    error: mutation.error ? toPresentableError(mutation.error) : null,
    report: mutation.data ?? null,
    reset: () => mutation.reset(),
  };
}
