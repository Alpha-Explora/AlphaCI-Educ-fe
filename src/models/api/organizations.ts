// MODEL LAYER — Organizations / Admin resource
import { apiDownload, apiRequest, apiUpload } from "./client";
import type {
  AddStaffRequest,
  AddTeacherRequest,
  AddTeacherResponse,
  AdminOverview,
  ArchiveSemesterResponse,
  GithubTeamWithMembers,
  LabExtensionManifest,
  LabSetupInfo,
  ReconcileResponse,
  RemoveAdminResponse,
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

  /**
   * Removes an IT admin from EVERY laboratory — the inverse of addAdmin, and
   * likewise with no organization id, because the role never had a single lab.
   */
  removeAdmin(userId: string) {
    return apiRequest<RemoveAdminResponse>(`/organizations/admins/${userId}`, {
      method: "DELETE",
    });
  },

  /** Lab PC readiness: every prerequisite for the VS Code handoff, verified. */
  labSetup(id: string) {
    return apiRequest<LabSetupInfo>(`/organizations/${id}/lab-setup`);
  },

  /**
   * The install script, with this deployment's backend URL already in it.
   *
   * FETCHED, NOT NAVIGATED TO. This used to return a URL for
   * `window.location.assign`, which 401s whenever the frontend and backend are
   * different sites: this client authenticates with a bearer token, and a
   * navigation can only carry cookies. It worked locally because :3000 and :4000
   * are the same site for cookies, and failed on Vercel -> Render. See apiDownload.
   */
  downloadLabSetupScript(id: string, workDirPolicy: "ephemeral" | "persistent") {
    return apiDownload(`/organizations/${id}/lab-setup/script`, { workDirPolicy });
  },

  /**
   * Publish a .vsix as the version every lab PC should converge on.
   *
   * Raw bytes, not multipart — the server reads the body directly, so there is no
   * form to encode and no parser to add on either side. The VERSION is read out of
   * the package server-side rather than sent from here: a filename or a form field
   * could disagree with the artifact, and then every lab PC would be told it was
   * current when it was not.
   *
   * NOT under `/organizations/:id`, because the extension is one artifact for the
   * whole deployment rather than per laboratory — every lab runs the same build.
   */
  publishLabExtension(file: Blob) {
    return apiUpload<LabExtensionManifest>("/lab-extension", file);
  },

  /**
   * The published .vsix.
   *
   * Fetched for the same reason as the script above. This one had a second failure
   * waiting: the route also accepts a lab-extension token, and once
   * LAB_EXTENSION_TOKEN is set on the server, an anonymous navigation would be
   * refused outright. It only appeared to work because that token is unset.
   */
  downloadLabExtension() {
    return apiDownload("/lab-extension/vsix");
  },
};
