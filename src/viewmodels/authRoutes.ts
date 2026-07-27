// ============================================================================
// VIEWMODEL LAYER — Auth routing policy
//
// "Where does this person belong after signing in?" is a product rule, not
// markup, so it lives here rather than inside a page component. It previously
// sat as a private `destinationFor()` inside src/app/page.tsx, which meant any
// second caller had to copy it — and a copy that drifts sends someone to the
// wrong dashboard.
//
// Pure functions and constants only: no React, no fetching. Views read these;
// they never redefine them.
// ============================================================================
import type { SignInAudience, UserRole } from "@/models/types";

/**
 * The single sign-in door.
 *
 * There used to be two (/signin/student and /signin/staff) because staff signed
 * in with GitHub and students with a password. GitHub is no longer a login — it
 * is an account LINK staff perform after signing in — so everyone now shares one
 * email + password form. The old paths still exist as redirects so bookmarks and
 * printed handouts keep working.
 */
export const SIGN_IN_ROUTE = "/signin";

/** Where staff attach their GitHub identity (and pick up their real role). */
export const CONNECT_GITHUB_ROUTE = "/connect-github";

export const SIGN_IN_ROUTES = {
  student: SIGN_IN_ROUTE,
  staff: SIGN_IN_ROUTE,
} as const;

/** Where each role lands once authenticated. */
export function destinationFor(role: UserRole): string {
  switch (role) {
    case "TEACHER":
      return "/teacher";
    case "STUDENT":
      return "/student";
    case "ADMIN":
      return "/admin";
    // The platform operator's home is the cross-lab console, not any one lab.
    case "SUPER_ADMIN":
      return "/super";
  }
}

/**
 * May `userRole` enter the area built for `areaRole`?
 *
 * Normally an area is for exactly its own role. The one exception is the
 * platform operator, who may also enter the IT-Admin area — they hold full
 * admin authority in every lab, so bouncing them off /admin would make that
 * authority unusable through the UI.
 *
 * They are deliberately NOT admitted to /teacher or /student: those surfaces
 * are scoped to the signed-in person's OWN classes and repositories, so an
 * operator would land on a convincing but empty dashboard. Cross-lab visibility
 * belongs on /super, and per-lab administration on /admin.
 */
export function canEnterArea(userRole: UserRole, areaRole: UserRole): boolean {
  if (userRole === areaRole) return true;
  return userRole === "SUPER_ADMIN" && areaRole === "ADMIN";
}

/**
 * Which door a given role is expected to use.
 *
 * Vestigial now that there is one door — kept because the API still ACCEPTS an
 * audience from older clients and enforces it when present. Nothing in this app
 * sends one any more.
 */
export function audienceFor(role: UserRole): SignInAudience {
  return role === "STUDENT" ? "STUDENT" : "STAFF";
}

/** The sign-in route for whoever holds this role. One door, so: always the same. */
export function signInRouteFor(_role: UserRole): string {
  return SIGN_IN_ROUTE;
}

/**
 * Must this person link their GitHub account before their dashboard is usable?
 *
 * Staff only, and only once: students are zero-footprint and never hold a GitHub
 * identity. Until the link exists their role is only what their profile says —
 * it is the link that lets Team membership decide their real role.
 */
export function needsGithubLink(role: UserRole, githubLogin: string | null | undefined): boolean {
  return role !== "STUDENT" && !githubLogin;
}

/**
 * ADDENDUM K — a staff user with access to more than one lab must choose one
 * before their dashboard means anything, so the picker takes precedence over
 * the role destination.
 */
export function postLoginDestination(
  role: UserRole,
  needsLabSelection: boolean,
  githubLogin?: string | null,
): string {
  // Linking comes FIRST: it can change the role, which changes both the lab list
  // and the destination. Sending someone to a lab picker built from a role they
  // are about to stop having would just have to be redone a moment later.
  if (needsGithubLink(role, githubLogin)) return CONNECT_GITHUB_ROUTE;
  return needsLabSelection ? "/select-lab" : destinationFor(role);
}
