// MODEL LAYER — Repositories resource
import { apiRequest } from "./client";
import type {
  AssignmentRepository,
  GithubRepoActivity,
  GithubRunJobs,
  JobLogView,
  PullRequestComment,
  MergeResult,
  PipelineRun,
  PipelineRunDetail,
  ProvisionRepositoryResult,
  PullRequestFile,
  PullRequestView,
  RepoContentListing,
  RepositoryDetail,
} from "../types";

export const repositoriesApi = {
  get(id: string) {
    return apiRequest<RepositoryDetail>(`/repositories/${id}`);
  },

  submit(id: string) {
    return apiRequest<AssignmentRepository>(`/repositories/${id}/submit`, {
      method: "POST",
    });
  },

  grade(id: string, payload: { grade: number; feedback: string }) {
    return apiRequest<AssignmentRepository>(`/repositories/${id}/grade`, {
      method: "POST",
      body: payload,
    });
  },

  // NOTE: `POST /repositories/:id/lab-token` is deliberately NOT bound here.
  // It mints a raw `ghs_` push credential, and the UI that displayed one — the
  // student-facing "Lab access token" card — is gone; the VS Code handoff does
  // the same job without the token ever reaching a screen or a clipboard. The
  // route remains server-side as an operator escape hatch (curl, see the backend
  // README). Re-binding it would put that credential back in a browser.

  // ADDENDUM B — provision a single repo record on GitHub (gated/simulated).
  provision(id: string) {
    return apiRequest<ProvisionRepositoryResult>(`/repositories/${id}/provision`, {
      method: "POST",
    });
  },

  triggerRun(id: string) {
    return apiRequest<PipelineRunDetail>(`/repositories/${id}/pipeline-runs`, {
      method: "POST",
    });
  },

  runs(id: string) {
    return apiRequest<PipelineRun[]>(`/repositories/${id}/pipeline-runs`);
  },

  // ADDENDUM M — LIVE GitHub state: real branches, commits and Actions runs.
  githubActivity(id: string, branch?: string) {
    return apiRequest<GithubRepoActivity>(`/repositories/${id}/github-activity`, {
      query: { branch },
    });
  },

  /**
   * One run's jobs and steps — the detail behind a run in the Actions view.
   *
   * Separate from githubActivity because that one polls: fetching every run's
   * jobs on every poll would spend the lab's shared GitHub rate limit on detail
   * nobody has opened.
   */
  workflowRunJobs(id: string, runId: number) {
    return apiRequest<GithubRunJobs>(
      `/repositories/${id}/github-activity/runs/${runId}/jobs`,
    );
  },

  /** The conversation on a pull request, oldest first. */
  pullRequestComments(id: string, number: number) {
    return apiRequest<PullRequestComment[]>(
      `/repositories/${id}/pull-requests/${number}/comments`,
    );
  },

  createPullRequestComment(
    id: string,
    number: number,
    body: { body: string; replyToId?: string },
  ) {
    return apiRequest<PullRequestComment>(
      `/repositories/${id}/pull-requests/${number}/comments`,
      { method: "POST", body },
    );
  },

  updatePullRequestComment(id: string, number: number, commentId: string, body: string) {
    return apiRequest<PullRequestComment>(
      `/repositories/${id}/pull-requests/${number}/comments/${commentId}`,
      { method: "PATCH", body: { body } },
    );
  },

  deletePullRequestComment(id: string, number: number, commentId: string) {
    return apiRequest<{ deleted: number }>(
      `/repositories/${id}/pull-requests/${number}/comments/${commentId}`,
      { method: "DELETE" },
    );
  },

  /**
   * One job's console output — the "why" behind a red step.
   *
   * On demand only. This is the largest response in the product and nothing
   * polls it; a student fetches it when they open a failing step.
   */
  jobLogs(id: string, jobId: number) {
    return apiRequest<JobLogView>(
      `/repositories/${id}/github-activity/jobs/${jobId}/logs`,
    );
  },

  /**
   * Browse the repository's code at a branch.
   *
   * `ref` is a branch name (or sha). Omitting `path` lists the root.
   */
  files(id: string, params: { path?: string; ref?: string }) {
    return apiRequest<RepoContentListing>(`/repositories/${id}/files`, {
      query: { path: params.path, ref: params.ref },
    });
  },

  // ── Pull requests ──────────────────────────────────────────────────────
  // Students have no GitHub account and their lab token cannot open a pull
  // request, so these four calls are the only route from a pushed branch to a
  // merged one. The server decides every merge; nothing here can bypass it.

  pullRequests(id: string) {
    return apiRequest<PullRequestView[]>(`/repositories/${id}/pull-requests`);
  },

  openPullRequest(id: string, payload: { head: string; base: string; title?: string }) {
    return apiRequest<PullRequestView>(`/repositories/${id}/pull-requests`, {
      method: "POST",
      body: payload,
    });
  },

  /** The changed files and patches for one pull request. */
  pullRequestFiles(id: string, number: number) {
    return apiRequest<PullRequestFile[]>(
      `/repositories/${id}/pull-requests/${number}/files`,
    );
  },

  approvePullRequest(id: string, number: number) {
    return apiRequest<PullRequestView>(
      `/repositories/${id}/pull-requests/${number}/approve`,
      { method: "POST" },
    );
  },

  /**
   * `override` is teacher-only and the server enforces that. It bypasses a
   * failing pipeline, never the peer-review requirement.
   */
  mergePullRequest(
    id: string,
    number: number,
    payload?: { override?: boolean; reason?: string },
  ) {
    return apiRequest<MergeResult>(`/repositories/${id}/pull-requests/${number}/merge`, {
      method: "POST",
      body: payload ?? {},
    });
  },
};
