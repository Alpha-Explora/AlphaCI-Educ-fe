"use client";
// ============================================================================
// VIEWMODEL LAYER — Class join code (teacher, ADDENDUM D)
// The 6-ish char "whiteboard code" students type under + Join Class.
// Owns: fetching the code, regenerating it (invalidates the old one), and
// toggling joining on/off — plus cache invalidation. Also derives an
// `isExpired` flag and a `canJoin` summary so the View stays presentational.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classesApi } from "@/models/api";
import type { JoinCodeInfo } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface JoinCodeVM {
  data: JoinCodeInfo | undefined;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  /** true when an expiry is set and already in the past. */
  isExpired: boolean;
  /** active AND not expired — students can join right now. */
  canJoin: boolean;

  regenerate: () => void;
  isRegenerating: boolean;
  regenerateError: PresentableError | null;

  setActive: (active: boolean) => void;
  isToggling: boolean;
  toggleError: PresentableError | null;
}

export function useJoinCode(classId: string | null): JoinCodeVM {
  const queryClient = useQueryClient();
  const key = queryKeys.classes.joinCode(classId ?? "none");

  const query = useQuery({
    queryKey: key,
    queryFn: () => classesApi.getJoinCode(classId as string),
    enabled: Boolean(classId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    // The class record carries magicJoinCode/joinCodeActive too.
    queryClient.invalidateQueries({ queryKey: ["classes"] });
  };

  const regenerateMutation = useMutation({
    mutationFn: () => classesApi.regenerateJoinCode(classId as string),
    onSuccess: (fresh) => {
      // Optimistically show the new code while the refetch lands.
      queryClient.setQueryData<JoinCodeInfo | undefined>(key, (prev) =>
        prev ? { ...prev, ...fresh } : prev,
      );
      invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) =>
      classesApi.toggleJoinCode(classId as string, active),
    onSuccess: (res) => {
      queryClient.setQueryData<JoinCodeInfo | undefined>(key, (prev) =>
        prev ? { ...prev, active: res.active } : prev,
      );
      invalidate();
    },
  });

  const expiresAt = query.data?.expiresAt ?? null;
  const isExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),

    isExpired,
    canJoin: Boolean(query.data?.active) && !isExpired,

    regenerate: () => regenerateMutation.mutate(),
    isRegenerating: regenerateMutation.isPending,
    regenerateError: regenerateMutation.error
      ? toPresentableError(regenerateMutation.error)
      : null,

    setActive: (active: boolean) => toggleMutation.mutate(active),
    isToggling: toggleMutation.isPending,
    toggleError: toggleMutation.error
      ? toPresentableError(toggleMutation.error)
      : null,
  };
}
