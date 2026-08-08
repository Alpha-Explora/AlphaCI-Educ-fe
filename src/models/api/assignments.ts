// MODEL LAYER — Assignments resource
import { apiRequest } from "./client";
import type {
  AnswerKey,
  Assignment,
  OriginalityReport,
  AssignmentRepository,
  ProjectTemplateOption,
  ProvisionResult,
} from "../types";

export const assignmentsApi = {
  /**
   * The starter projects a teacher may choose from, newest catalogue first-hand
   * from the server rather than mirrored in this repo.
   *
   * Returned already ordered by teaching difficulty, and each entry carries the
   * stacks it supports so the picker can hide combinations that do not exist.
   */
  templates() {
    return apiRequest<ProjectTemplateOption[]>(`/assignments/templates`);
  },

  /**
   * The reference solution for this project's starter. STAFF ONLY — the server
   * refuses anyone who does not teach the class, so this must never be called
   * from a student surface.
   */
  answerKey(id: string) {
    return apiRequest<AnswerKey>(`/assignments/${id}/answer-key`);
  },

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

  /**
   * Teacher publishes or withholds marks for every repository in this
   * assignment. Reversible on purpose: a teacher who releases and then finds a
   * broken hidden test needs to pull marks back while they fix it.
   */
  setGradesReleased(id: string, released: boolean) {
    // The OBJECT, not a string. `apiRequest` stringifies the body itself, so
    // stringifying here sent `"{\"released\":true}"` — a JSON *string* rather
    // than a JSON object. Express's parser runs in strict mode, which only
    // accepts an object or an array at the top level, so it rejected the request
    // before any handler saw it and the teacher got a raw parser error
    // ("Unexpected token '\"' … is not valid JSON") where Publish marks should
    // have been. Every other method in this file passes the object.
    return apiRequest<Assignment>(`/assignments/${id}/grades-released`, {
      method: "POST",
      body: { released },
    });
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

  /**
   * Compare every submission in this project against the rest of the cohort.
   *
   * Teacher-triggered, not automatic: run on Monday it compares three
   * submissions, and it would mean something different by Friday. An explicit
   * action is also the right shape for something that can put a similarity
   * figure next to a student's name.
   */
  originalityCheck(id: string) {
    return apiRequest<OriginalityReport>(
      `/assignments/${id}/originality-check`,
      { method: "POST" },
    );
  },
};
