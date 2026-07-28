// MODEL LAYER — Auth resource
// Three ways in:
//   • passwordLogin  — real email + password, verified against Supabase Auth.
//                      Students use this; staff use it as a fallback.
//   • githubStartUrl — staff GitHub OAuth (full-page redirect, not a fetch).
//   • mockLogin      — legacy persona switcher, demo only.
// Session is validated with me() and cleared with logout().
import { apiRequest, API_BASE_URL } from "./client";
import type {
  AuthLoginResponse,
  GithubConnectionStatus,
  LabsResponse,
  PasswordLoginRequest,
  SystemUser,
  UserRole,
} from "../types";

export const authApi = {
  /**
   * Real credential sign-in for EVERY role.
   *
   * No `audience` is sent: there is one door now, so there is no door to
   * mismatch. The API still accepts the field from older clients and enforces it
   * when present, which is why removing it here is safe rather than breaking.
   */
  passwordLogin(credentials: PasswordLoginRequest) {
    return apiRequest<AuthLoginResponse>("/auth/login", {
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

  // Legacy persona switcher — demo only, students only. Superseded by
  // passwordLogin; kept so the seeded-persona demo path still works when no
  // Supabase project is configured.
  mockLogin(payload: { userId: string } | { role: UserRole }) {
    return apiRequest<AuthLoginResponse>("/auth/mock-login", {
      method: "POST",
      body: payload,
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
