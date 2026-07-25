// MODEL LAYER — Auth resource
// Students: mock login (unchanged). Teachers: real GitHub OAuth via a browser
// redirect to `githubStartUrl()`. Session is validated with me() (cookie for
// teachers, bearer token for students) and cleared with logout().
import { apiRequest, API_BASE_URL } from "./client";
import type {
  AuthLoginResponse,
  LabsResponse,
  SystemUser,
  UserRole,
} from "../types";

export const authApi = {
  // Students / admins — mock system-account login.
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
