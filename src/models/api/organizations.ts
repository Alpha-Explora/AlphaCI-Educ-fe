// MODEL LAYER — Organizations / Admin resource
import { apiRequest, API_BASE_URL } from "./client";
import type {
  AddStaffRequest,
  AddTeacherRequest,
  AddTeacherResponse,
  AdminOverview,
  ArchiveSemesterResponse,
  GithubTeamWithMembers,
  LabSetupInfo,
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

  /**
   * Appoints an IT admin across EVERY laboratory — hence no organization id.
   *
   * The role was always platform-wide in effect (the API grants admins every
   * lab when it resolves access), but the appointment used to invite them into
   * just one laboratory's GitHub organization, so their access and their GitHub
   * membership disagreed. The endpoint now sits above any one laboratory to
   * match what the role actually is.
   */
  addAdmin(payload: AddStaffRequest) {
    return apiRequest<AddTeacherResponse>("/organizations/admins", {
      method: "POST",
      body: payload,
    });
  },

  /** Lab PC readiness: every prerequisite for the VS Code handoff, verified. */
  labSetup(id: string) {
    return apiRequest<LabSetupInfo>(`/organizations/${id}/lab-setup`);
  },

  /**
   * URL of the install script with this deployment's backend URL baked in.
   *
   * A plain link rather than a fetch: the response is an attachment, so letting
   * the browser navigate gives a real Save dialog. Session cookies ride along
   * on a same-site navigation, so the ADMIN check still applies.
   */
  labSetupScriptUrl(id: string, workDirPolicy: "ephemeral" | "persistent") {
    return `${API_BASE_URL}/organizations/${id}/lab-setup/script?workDirPolicy=${workDirPolicy}`;
  },
};
