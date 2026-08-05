"use client";
// ============================================================================
// VIEWMODEL LAYER — Class access, STUDENT side (the gate).
//
// Signing in is not enough to use this product: a student must also type the
// code their teacher is displaying, once per sign-in. This owns that state for
// the whole student area — whether the gate is up, spending a code, and noticing
// when the teacher ends the class.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classAccessApi } from "@/models/api";
import type { StudentAccessStatus } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

/**
 * How often an admitted student re-checks that the class is still open.
 *
 * The teacher's "End class" revokes access server-side immediately — every API
 * call starts refusing at once — but nothing pushes that to an open tab, so
 * without this poll a student would keep looking at an already-dead dashboard
 * until they clicked something. 30s is a compromise: fast enough that the screen
 * agrees with the room within half a minute, slow enough that thirty tabs in a
 * laboratory are not hammering the endpoint.
 *
 * Only runs while ADMITTED. A student sitting on the gate screen has nothing to
 * poll for — they are waiting on a code, not on the server.
 */
const ADMISSION_POLL_MS = 30_000;

export interface ClassCodeGateVM {
  /** Undefined until the first check resolves — render nothing rather than guess. */
  isReady: boolean;
  /** true once a code has been accepted for this sign-in. */
  admitted: boolean;
  /** The class whose code let them in, for the "You're in ..." line. */
  className: string | null;

  submit: (code: string) => void;
  isSubmitting: boolean;
  submitError: PresentableError | null;
  /** Clears a stale error so the field looks fresh as soon as they retype. */
  clearError: () => void;
}

export function useClassCodeGate(enabled: boolean): ClassCodeGateVM {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.classAccess.me,
    queryFn: () => classAccessApi.me(),
    enabled,
    refetchInterval: (q) => (q.state.data?.admitted ? ADMISSION_POLL_MS : false),
    // Re-check when the student comes back to the tab. The common shape of a lab
    // session is "open the dashboard, work in VS Code for twenty minutes, come
    // back" — and the class may have ended in between.
    refetchOnWindowFocus: true,
  });

  const redeemMutation = useMutation({
    mutationFn: (code: string) => classAccessApi.redeem(code),
    onSuccess: (fresh: StudentAccessStatus) => {
      queryClient.setQueryData<StudentAccessStatus>(queryKeys.classAccess.me, fresh);
      /*
        Everything else in the cache is wrong at this moment, and specifically it
        is wrong in a way that does not heal on its own.

        While the gate was up, every dashboard query the shell fired was refused
        with 403 CLASS_CODE_REQUIRED and React Query stored that as each key's
        ERROR state. Those keys are not stale-but-renderable, they are failed —
        so without a blanket invalidation the student lands on a dashboard of
        error boxes and has to reload the page to see their own work.
      */
      void queryClient.invalidateQueries();
    },
  });

  return {
    isReady: !query.isLoading,
    admitted: Boolean(query.data?.admitted),
    className: query.data?.className ?? null,

    submit: (code: string) => redeemMutation.mutate(code),
    isSubmitting: redeemMutation.isPending,
    submitError: redeemMutation.error ? toPresentableError(redeemMutation.error) : null,
    clearError: () => redeemMutation.reset(),
  };
}
