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
 * Where a completed sign-in lands.
 *
 * There is no longer a lab picker in this path. A staff user with several labs
 * used to be sent to /select-lab before their dashboard meant anything; the
 * backend now auto-selects their first lab and the header's switcher changes it
 * whenever they like — which is strictly better, because the choice is
 * revisitable instead of being demanded once at the door.
 *
 * Linking GitHub still comes first: it can change the ROLE, and therefore the
 * destination, so routing before it resolves would just have to be redone.
 */
export function postLoginDestination(
  role: UserRole,
  githubLogin?: string | null,
): string {
  if (needsGithubLink(role, githubLogin)) return CONNECT_GITHUB_ROUTE;
  return destinationFor(role);
}
