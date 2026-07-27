// MODEL LAYER — Organizations / Admin resource
import { apiRequest } from "./client";
import type {
  AddStaffRequest,
  AddTeacherRequest,
  AddTeacherResponse,
  AdminOverview,
  ArchiveSemesterResponse,
  GithubTeamWithMembers,
  ReconcileResponse,
  RemoveStaffResponse,
  StudentAccountSummary,
  SystemUser,
  TransferableTeacher,
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

  /** The lab's teaching staff. */
  teachers(id: string) {
    return apiRequest<SystemUser[]>(`/organizations/${id}/teachers`);
  },

  /**
   * Teachers who already exist on the platform but are not in THIS laboratory.
   * Picking one fills the add form with values the API will accept — the email
   * and GitHub handle must match their existing record exactly.
   */
  transferableTeachers(id: string) {
    return apiRequest<TransferableTeacher[]>(
      `/organizations/${id}/teachers/available`,
    );
  },

  /**
   * The lab's student accounts with their sign-in signals. ADMIN only — this is
   * a roster of student email addresses, which is why it is its own endpoint
   * rather than part of the (ungated) admin overview payload.
   */
  students(id: string) {
    return apiRequest<StudentAccountSummary[]>(`/organizations/${id}/students`);
  },

  /**
   * Admin adds a teacher by name + email. The backend also arranges their
   * source-host access and password invite; the response reports what actually
   * went out so the UI can be honest about partial success.
   */
  addTeacher(id: string, payload: AddTeacherRequest) {
    return apiRequest<AddTeacherResponse>(`/organizations/${id}/teachers`, {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Platform operator appoints an IT admin for a laboratory. SUPER_ADMIN only —
   * an IT admin cannot appoint further IT admins, which is what keeps the role
   * chain from being self-extending.
   */
  /**
   * Remove a teacher from the system AND the GitHub organization. Archives
   * rather than deletes, so their classes and their students' graded work
   * survive; the account is revoked immediately either way.
   */
  removeTeacher(id: string, userId: string) {
    return apiRequest<RemoveStaffResponse>(
      `/organizations/${id}/teachers/${userId}`,
      { method: "DELETE" },
    );
  },

  /**
   * The other direction: archive staff who are no longer in the GitHub
   * organization. Changes nothing if GitHub can't be read.
   */
  reconcileStaff(id: string) {
    return apiRequest<ReconcileResponse>(
      `/organizations/${id}/staff/reconcile`,
      { method: "POST" },
    );
  },

  addAdmin(id: string, payload: AddStaffRequest) {
    return apiRequest<AddTeacherResponse>(`/organizations/${id}/admins`, {
      method: "POST",
      body: payload,
    });
  },
};
