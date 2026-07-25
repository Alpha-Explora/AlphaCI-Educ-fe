// MODEL LAYER — Organizations / Admin resource
import { apiRequest } from "./client";
import type {
  AdminOverview,
  ArchiveSemesterResponse,
  GithubTeamWithMembers,
  UniversityOrganization,
} from "../types";

export const organizationsApi = {
  list() {
    return apiRequest<UniversityOrganization[]>("/organizations");
  },

  get(id: string) {
    return apiRequest<UniversityOrganization>(`/organizations/${id}`);
  },

  adminOverview(id: string) {
    return apiRequest<AdminOverview>(`/organizations/${id}/admin/overview`);
  },

  // ADDENDUM A — full 4-tier GitHub team hierarchy (ordered by tier then name).
  // The admin/overview response already carries `githubTeams`; this dedicated
  // endpoint exists for completeness / standalone consumers.
  githubTeams(id: string) {
    return apiRequest<GithubTeamWithMembers[]>(
      `/organizations/${id}/github-teams`,
    );
  },

  archiveSemester(id: string) {
    return apiRequest<ArchiveSemesterResponse>(
      `/organizations/${id}/archive-semester`,
      { method: "POST" },
    );
  },
};
