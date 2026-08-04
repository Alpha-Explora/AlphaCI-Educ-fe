"use client";
// ============================================================================
// VIEWMODEL LAYER — Lab Session handoff (docs/LAB_SESSION_HANDOFF_PLAN.md).
//
// Starts a secure "open in VS Code" session, and — equally important — reports
// the one that is ALREADY running.
//
// WHY THE STATUS QUERY EXISTS. This VM used to hold session state only from a
// start response, so the countdown existed exactly as long as the React state
// did: a page reload wiped it, and a student looking at a panel with no clock and
// a Start button pressed the button, because that was the only way to find out
// where they stood. Reading the deadline is now a GET that mints nothing, and
// pressing Start again is idempotent server-side, so neither route can hand out a
// second credential.
//
// There is no manual fallback any more (the lab-token panel is gone), so every
// failure here has to be actionable on its own terms — "ask your teacher" rather
// than "use the steps below", which would now point at nothing.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionApi, ApiError } from "@/models/api";

/**
 * `idle` — nothing started yet, or the window closed.
 * `launching` — a deep link has been handed to the OS; VS Code should appear.
 * `simulated` — the server has no GitHub credentials, so no clone can happen.
 * `unavailable` — the feature is off, or the start failed.
 * `throttled` — a launch is already in flight; pressing again changed nothing.
 */
export type StartPhase = "idle" | "launching" | "simulated" | "unavailable" | "throttled";

export interface StartAssignmentVM {
  start: () => void;
  isStarting: boolean;
  phase: StartPhase;
  message: string | null;
  /** True once VS Code has collected a launch — the button becomes "Reopen". */
  launched: boolean;
  /** False when the operator has not switched the handoff on. */
  handoffEnabled: boolean;
  /**
   * Whether this student may work on this project right now.
   *
   * Governed by the teacher: the project must be open AND the class inside its
   * meeting hours. There is no session clock — access simply continues while this
   * stays true, which is why the panel shows a timetable rather than a countdown.
   */
  openNow: boolean;
  /** Why not, in the server's words. Null while open. */
  closedReason: string | null;
  /** The class's weekly hours, e.g. "Mon, Wed, Fri · 08:00–10:00". */
  scheduleLabel: string | null;
  /** Still loading the initial status: neither "no session" nor "one exists" yet. */
  isLoadingStatus: boolean;
  /**
   * Re-follow the deep link WITHOUT calling the server.
   *
   * For "VS Code didn't open" — often a permission dialog that was dismissed, or
   * a browser that swallowed the first navigation. Null until a link exists.
   * Deliberately not a second start: the claim is single-use, so re-following the
   * same link is either harmless or the thing that finally works.
   */
  retryOpen: (() => void) | null;
}

export function useStartAssignment(repoId: string | null): StartAssignmentVM {
  const [phase, setPhase] = useState<StartPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const statusKey = ["repositories", repoId ?? "none", "session-status"];

  const status = useQuery({
    queryKey: statusKey,
    queryFn: () => sessionApi.status(repoId as string),
    enabled: Boolean(repoId),
    // The server is the only authority on the deadline, and a lab PC's clock may
    // disagree with it. Re-read on refocus so a tab left open across a break
    // shows the truth rather than a stale local countdown.
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    // A student who cannot read their own status has a bigger problem than a
    // missing clock; retrying would only delay the panel rendering at all.
    retry: false,
  });

  /**
   * Hand a `vscode://` link to the OS.
   *
   * `location.href` rather than `window.open`: a popup blocker silently drops the
   * second one, and there is no window to show — the browser is being asked to
   * pass the URL to a registered protocol handler and stay where it is.
   */
  const openDeepLink = useCallback((link: string) => {
    if (typeof window !== "undefined") window.location.href = link;
  }, []);

  const mutation = useMutation({
    mutationFn: () => sessionApi.start(repoId as string),
    onSuccess: (res) => {
      // The window may have been created by THIS call, so the cached status is
      // now wrong in the direction that matters (it says "no session"). Refetch
      // rather than patch: the server owns both the deadline and `launched`.
      void queryClient.invalidateQueries({ queryKey: statusKey });

      if (res.live && res.deepLink) {
        setDeepLink(res.deepLink);
        setPhase("launching");
        setMessage(
          res.reused
            ? // Not an error, and not a no-op either: the first launch is still
              // valid and this re-followed it. Saying so stops the student
              // pressing a third time.
              "Still opening the launch you already started — no second copy was created."
            : null,
        );
        openDeepLink(res.deepLink);
      } else {
        // A simulated token cannot clone a real repository. With no manual
        // fallback left, this is a server-side gap only staff can close.
        setDeepLink(null);
        setPhase("simulated");
        setMessage(
          "This server has no GitHub connection yet, so VS Code can't be opened. Tell your teacher — they need to finish connecting this lab.",
        );
      }
    },
    onError: (err) => {
      setDeepLink(null);
      if (err instanceof ApiError) {
        if (err.status === 429) {
          // The server refused to mint a second credential. That is the feature
          // working, so it must not read as a failure.
          setPhase("throttled");
          setMessage(err.message);
          return;
        }
        setPhase("unavailable");
        setMessage(startFailureMessage(err));
        return;
      }
      setPhase("unavailable");
      setMessage("Couldn't start the assignment. Try again, and tell your teacher if it keeps failing.");
    },
  });

  // Once the project shuts — end of class, or the teacher closing it — a stale
  // "opening VS Code…" notice is worse than none: it describes an editor session
  // whose credential has stopped being renewed.
  const openNow = status.data?.openNow ?? true;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(() => {
    if (!openNow && (phaseRef.current === "launching" || phaseRef.current === "throttled")) {
      setPhase("idle");
      setMessage(null);
      setDeepLink(null);
    }
  }, [openNow]);

  return {
    start: () => {
      if (repoId && !mutation.isPending) mutation.mutate();
    },
    isStarting: mutation.isPending,
    phase,
    message,
    launched: status.data?.launched ?? false,
    handoffEnabled: status.data?.handoffEnabled ?? true,
    openNow,
    closedReason: status.data?.closedReason ?? null,
    scheduleLabel: status.data?.scheduleLabel ?? null,
    isLoadingStatus: status.isLoading,
    retryOpen: deepLink ? () => openDeepLink(deepLink) : null,
  };
}

/**
 * What to tell a student when a start fails.
 *
 * Each branch names who can act, because none of these are fixable from this
 * page and the old copy sent every one of them to a fallback panel that no longer
 * exists.
 */
function startFailureMessage(err: ApiError): string {
  if (err.status === 503) {
    return "One-click launch isn't switched on for this server yet. Tell your teacher — nothing you can do from here will fix it.";
  }
  if (err.isNetworkError) {
    return "Couldn't reach the server. Check the lab's internet connection and try again.";
  }
  return err.message;
}
