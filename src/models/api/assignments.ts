// MODEL LAYER — Assignments resource
import { apiRequest } from "./client";
import type { Assignment, AssignmentRepository, ProvisionResult } from "../types";

export const assignmentsApi = {
  get(id: string) {
    return apiRequest<Assignment>(`/assignments/${id}`);
  },

  repositories(id: string) {
    return apiRequest<AssignmentRepository[]>(`/assignments/${id}/repositories`);
  },

  // ADDENDUM B — teacher bulk-provisions one repo per enrolled student
  // (gated/simulated). Returns created repos + skipped count + live flag.
  provisionRepositories(id: string) {
    return apiRequest<ProvisionResult>(
      `/assignments/${id}/provision-repositories`,
      { method: "POST" },
    );
  },

  // Teacher-of-class (or admin) deletes a project: removes the assignment + its
  // repos locally and (live only) the real GitHub repos. 403 if not your class.
  remove(id: string) {
    return apiRequest<{
      deleted: boolean;
      assignmentId: string;
      reposRemoved: number;
      githubReposDeleted: number;
    }>(`/assignments/${id}`, { method: "DELETE" });
  },

  // Teacher ENDS (closes) a project → students lose access (no session/token/
  // submit) and the real repos are archived read-only (live). `reopen` reverses.
  end(id: string) {
    return apiRequest<{ closed: boolean; assignmentId: string; reposLocked: number; githubArchived: number }>(
      `/assignments/${id}/end`,
      { method: "POST" },
    );
  },
  reopen(id: string) {
    return apiRequest<{ closed: boolean; assignmentId: string; reposLocked: number; githubArchived: number }>(
      `/assignments/${id}/reopen`,
      { method: "POST" },
    );
  },
};
