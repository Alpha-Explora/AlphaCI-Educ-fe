// MODEL LAYER — Lab Session handoff (docs/LAB_SESSION_HANDOFF_PLAN.md).
// Starts a secure "open in VS Code" session for a repo. Returns a vscode://
// deep link carrying only a single-use claim — never a token. 503 when the
// handoff feature is disabled (the View then shows the manual fallback).
import { apiRequest } from "./client";
import type { LabSessionLimits, StartSessionResponse } from "../types";

/**
 * Client-side ceiling for starting a session.
 *
 * Longer than the server's own GitHub timeout on purpose: the server should be
 * the one to give up first, because it can say WHY. This only catches the case
 * where the server never answers at all — a sleeping instance, a dropped
 * connection — which otherwise leaves the button spinning with no way out and
 * no message. Nothing is cancelled server-side; the student simply stops
 * waiting on an answer that is not coming.
 */
const START_TIMEOUT_MS = 30_000;

export const sessionApi = {
  start(repoId: string) {
    return apiRequest<StartSessionResponse>(`/repositories/${repoId}/session`, {
      method: "POST",
      signal: AbortSignal.timeout(START_TIMEOUT_MS),
    });
  },

  /**
   * The bounds a teacher must choose a session length within. Read-only policy,
   * so it is safe to fetch from the Create Project wizard.
   */
  limits() {
    return apiRequest<LabSessionLimits>("/session/limits");
  },
};
