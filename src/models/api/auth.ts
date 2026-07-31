// MODEL LAYER — Auth resource
// One way in, plus one way to attach GitHub afterwards:
//   • passwordLogin  — real email + password, for EVERY role. A student signing
//                      in with an allowed school address for the first time is
//                      provisioned by the API on the spot; nobody creates
//                      student accounts by hand.
//   • githubStartUrl — staff GitHub ACCOUNT LINK (full-page redirect, not a
//                      fetch). Not a sign-in.
// Session is validated with me() and cleared with logout().
import { apiRequest, API_BASE_URL } from "./client";
import type {
  AuthLoginResponse,
  GithubConnectionStatus,
  LabsResponse,
  PasswordLoginRequest,
  SystemUser,
} from "../types";

export const authApi = {
  /**
   * Real credential sign-in for EVERY role.
   *
   * `audience` names the door the credentials were typed at, and the API 403s a
   * mismatch. That refusal is a FEATURE, not a restriction: without it a teacher
   * who signs in on the student page is admitted and redirected to /student,
   * which renders perfectly and contains none of her classes — a dead end that
   * looks like a broken product rather than a wrong turn.
   */
  passwordLogin(credentials: PasswordLoginRequest) {
    return apiRequest<AuthLoginResponse>("/auth/login", {
      method: "POST",
      body: credentials,
    });
  },

  /**
   * Registers a student with their school email address.
   *
   * Creates CREDENTIALS only. The AlphaCI profile is created later, on the first
   * confirmed sign-in — so an address that never confirms never joins a roster.
   *
   * Unlike requestPasswordReset below, this DOES answer differently for a
   * refused address: "that is not your school's domain" and "you already have an
   * account" are both things the student has to read to get any further.
   */
  studentSignup(credentials: { email: string; password: string }) {
    return apiRequest<{
      created: boolean;
      needsEmailConfirmation: boolean;
      message: string;
    }>("/auth/student/signup", {
      method: "POST",
      body: credentials,
    });
  },

  /**
   * Sends a password-reset email via Supabase Auth. Deliberately resolves even
   * when the address is unknown — a distinguishable response here would turn
   * this endpoint into an account-enumeration oracle for a school roster.
   */
  requestPasswordReset(email: string) {
    return apiRequest<{ ok: true }>("/auth/request-password-reset", {
      method: "POST",
      body: { email },
    });
  },

  /**
   * The second half of a reset — and of every staff invitation.
   *
   * `accessToken` comes from the emailed link's FRAGMENT (`#access_token=…`),
   * which browsers never transmit to a server. That is why the page has to read
   * it and hand it back explicitly rather than the API just knowing.
   *
   * Resolves with `ok: false` and a readable message for an expired or
   * already-used link. That is not an error to throw on: it is the ordinary
   * outcome of opening yesterday's email, and the person needs to read it.
   */
  completePasswordReset(accessToken: string, password: string) {
    return apiRequest<{ ok: boolean; message: string }>("/auth/complete-password-reset", {
      method: "POST",
      body: { accessToken, password },
    });
  },

  // Current session user (teacher via GitHub cookie, or student via bearer
  // token). Throws ApiError(http, 401) when logged out.
  me() {
    return apiRequest<SystemUser>("/auth/me");
  },

  /**
   * Is the GitHub connection actually usable right now?
   *
   * Verified server-side against GitHub. Distinct from `user.githubLogin`,
   * which only records that a link once happened and cannot notice a revoked
   * authorization — the gap that let the UI claim "connected" while every
   * provisioning attempt returned 401.
   */
  githubStatus() {
    return apiRequest<GithubConnectionStatus>("/auth/github/status");
  },

  // Clears the server-side session (GitHub teachers) — also safe for students.
  logout() {
    return apiRequest<void>("/auth/logout", { method: "POST" });
  },

  // ADDENDUM K — the labs (orgs) the current staff user may work in + the
  // active one. Derived server-side from the courses an admin assigned her.
  labs() {
    return apiRequest<LabsResponse>("/auth/labs");
  },

  // ADDENDUM K — set the active lab for this session. Backend 403s if the user
  // has no access to that lab; returns the refreshed labs + selection.
  selectLab(orgId: string) {
    return apiRequest<LabsResponse>("/auth/select-lab", {
      method: "POST",
      body: { orgId },
    });
  },

  // ADDENDUM B/I — staff GitHub OAuth is a full-page browser REDIRECT (not a
  // fetch): the View navigates the window here. Backend 302s to GitHub, then
  // back to its callback, then to the dashboard for the role resolved from the
  // user's GitHub Team (/admin or /teacher). `returnTo` is only the fallback
  // destination if the flow errors before a role is established.
  githubStartUrl(returnTo = "/") {
    const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    return `${API_BASE_URL}/auth/github/start${qs}`;
  },
};
