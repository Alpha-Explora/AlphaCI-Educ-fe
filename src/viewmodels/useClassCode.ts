"use client";
// ============================================================================
// VIEWMODEL LAYER — spending a class code, STUDENT side.
//
// Replaced useClassCodeGate, which asked one all-or-nothing question ("am I past
// the gate?") and blocked the entire dashboard on the answer. That hid a
// student's own marks and feedback from them at any hour, and contradicted the
// rule the class schedule had always followed: reading is never blocked.
//
// It owns the MUTATION only. The per-class open/closed state rides on the
// student dashboard payload (ClassAccessState.state), because that is the
// payload the cards are already built from — a second query answering the same
// question would drift from it, and the laxer answer is the one a student would
// see. So this reads the states it needs from the caller and never fetches them.
// ============================================================================
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { classAccessApi } from "@/models/api";
import type { StudentClassState } from "@/models/types";
import { toPresentableError, type PresentableError } from "./errors";

export interface ClassCodeVM {
  submit: (code: string) => void;
  isSubmitting: boolean;
  submitError: PresentableError | null;
  /** Clears a stale error so the field looks fresh as soon as they retype. */
  clearError: () => void;
  /** The class they were just enrolled in by a join code, or null. */
  justEnrolledIn: string | null;
}

export function useClassCode(): ClassCodeVM {
  const queryClient = useQueryClient();

  const redeemMutation = useMutation({
    mutationFn: (code: string) => classAccessApi.redeem(code),
    onSuccess: () => {
      /*
        Everything, not just the dashboard. A redeem can ENROL the student —
        adding a course no cached query has ever seen — and it unlocks actions
        whose buttons are rendered from other queries entirely. Invalidating one
        key would leave a student looking at a class they had just joined with
        nothing inside it.
      */
      void queryClient.invalidateQueries();
    },
  });

  return {
    submit: (code: string) => redeemMutation.mutate(code),
    isSubmitting: redeemMutation.isPending,
    submitError: redeemMutation.error ? toPresentableError(redeemMutation.error) : null,
    clearError: () => redeemMutation.reset(),
    justEnrolledIn: redeemMutation.data?.justEnrolled
      ? (redeemMutation.data.className ?? "your class")
      : null,
  };
}

/**
 * Copy for each state, in one place so two cards cannot describe it differently.
 *
 * Each entry names what the student should DO, which is why the state is a union
 * of four rather than a boolean: "closed" alone leaves them with no next step,
 * and the four next steps are genuinely different.
 */
export const CLASS_STATE_COPY: Record<
  StudentClassState,
  { label: string; hint: string; tone: "success" | "warning" | "neutral" | "info" }
> = {
  open: {
    label: "Open",
    hint: "You can work on this class now.",
    tone: "success",
  },
  "needs-code": {
    label: "Enter code",
    hint: "Your teacher has started this class — type the code they're showing.",
    tone: "info",
  },
  "not-started": {
    label: "Closed",
    hint: "Your teacher hasn't started this class yet.",
    tone: "neutral",
  },
  "outside-hours": {
    label: "Outside class hours",
    hint: "Read anything you like here. Work opens during class hours.",
    tone: "warning",
  },
};
