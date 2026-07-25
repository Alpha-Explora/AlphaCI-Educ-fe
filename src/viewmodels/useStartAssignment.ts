"use client";
// VIEWMODEL LAYER — Lab Session handoff (docs/LAB_SESSION_HANDOFF_PLAN.md).
// Starts a secure "open in VS Code" session. On success with a LIVE token it
// launches the vscode:// deep link; otherwise (simulated, or the feature is
// off / any error) it surfaces a message and the View shows the manual fallback
// (the LabTokenPanel rendered right below).
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sessionApi, ApiError } from "@/models/api";

export type StartPhase = "idle" | "launching" | "simulated" | "unavailable";

export interface StartAssignmentVM {
  start: () => void;
  isStarting: boolean;
  phase: StartPhase;
  message: string | null;
}

export function useStartAssignment(repoId: string | null): StartAssignmentVM {
  const [phase, setPhase] = useState<StartPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => sessionApi.start(repoId as string),
    onSuccess: (res) => {
      if (res.live && res.deepLink) {
        setPhase("launching");
        setMessage(null);
        if (typeof window !== "undefined") {
          // Hands off to the AlphaCI VS Code extension via the OS.
          window.location.href = res.deepLink;
        }
      } else {
        // Simulated token can't drive a real clone — steer to the manual steps.
        setPhase("simulated");
        setMessage(
          "GitHub isn't enabled on this server yet, so VS Code can't be launched. Use the manual steps below to clone and push.",
        );
      }
    },
    onError: (err) => {
      setPhase("unavailable");
      if (err instanceof ApiError) {
        setMessage(
          err.status === 503
            ? "One-click launch isn't turned on yet. Use the manual steps below."
            : err.isNetworkError
              ? "Couldn't reach the backend. Use the manual steps below."
              : err.message,
        );
      } else {
        setMessage("Couldn't start the session. Use the manual steps below.");
      }
    },
  });

  return {
    start: () => {
      if (repoId) mutation.mutate();
    },
    isStarting: mutation.isPending,
    phase,
    message,
  };
}
