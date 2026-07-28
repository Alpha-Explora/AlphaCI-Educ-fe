// MODEL LAYER — Lab Session handoff (docs/LAB_SESSION_HANDOFF_PLAN.md).
// Starts a secure "open in VS Code" session for a repo. Returns a vscode://
// deep link carrying only a single-use claim — never a token. 503 when the
// handoff feature is disabled (the View then shows the manual fallback).
import { apiRequest } from "./client";
import type { LabSessionLimits, StartSessionResponse } from "../types";

export const sessionApi = {
  start(repoId: string) {
    return apiRequest<StartSessionResponse>(`/repositories/${repoId}/session`, {
      method: "POST",
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
