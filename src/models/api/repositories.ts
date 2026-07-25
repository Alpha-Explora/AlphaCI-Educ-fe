// MODEL LAYER — Repositories resource
import { apiRequest } from "./client";
import type {
  AssignmentRepository,
  GithubRepoActivity,
  LabToken,
  PipelineRun,
  PipelineRunDetail,
  ProvisionRepositoryResult,
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

  labToken(id: string) {
    return apiRequest<LabToken>(`/repositories/${id}/lab-token`, {
      method: "POST",
    });
  },

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
};
