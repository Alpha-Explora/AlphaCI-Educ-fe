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
 * TWO DOORS, one credential mechanism.
 *
 * The history is worth knowing before changing this. Originally there were two
 * doors because staff signed in with GitHub and students with a password — two
 * mechanisms, so two forms. GitHub stopped being a login (it is now an account
 * LINK staff perform after signing in), which collapsed both doors into one.
 *
 * That single door is what we are undoing here, for a different reason than the
 * one that created it. The mechanism really is identical now — both doors POST
 * the same email and password to the same endpoint — but the SURROUNDING COPY
 * cannot serve both audiences at once:
 *
 *   • A student's route to an account is self-registration, gated on the
 *     school's email domain (STUDENT_EMAIL_DOMAINS, server-side). "Create an
 *     account" belongs in front of them.
 *   • Staff are invited by an IT admin and may hold ANY address — a personal
 *     one, a district one, a contractor's. Nothing about the school domain
 *     applies to them, and "create an account with your school email" is at
 *     best noise and at worst reads as a refusal they have not yet hit.
 *
 * So: same lock, two labelled doors. The split is presentational, and the
 * `audience` field the API still enforces is what keeps a wrong-door attempt
 * from silently landing someone on a dashboard with none of their data.
 */
export const STUDENT_SIGN_IN_ROUTE = "/signin";
export const STAFF_SIGN_IN_ROUTE = "/signin/staff";

/**
 * The door to use when the role is unknown — a session that expired, a guard
 * bouncing an anonymous visitor, the landing page's call to action.
 *
 * The STUDENT door, because students outnumber staff by roughly a class at a
 * time and it carries a visible link to the staff door. Sending everyone to a
 * neutral chooser screen would tax the majority to spare the minority one
 * click.
 */
export const SIGN_IN_ROUTE = STUDENT_SIGN_IN_ROUTE;

/** Where staff attach their GitHub identity (and pick up their real role). */
export const CONNECT_GITHUB_ROUTE = "/connect-github";

export const SIGN_IN_ROUTES = {
  student: STUDENT_SIGN_IN_ROUTE,
  staff: STAFF_SIGN_IN_ROUTE,
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
 * Mirrors the server's rule in `assertAudienceMatches` exactly: STUDENT is its
 * own audience, and every staff role — teacher, IT admin, platform operator —
 * shares STAFF. Kept as a function rather than inlined so the two definitions
 * of "who counts as staff" cannot drift apart in one place and not the other.
 */
export function audienceFor(role: UserRole): SignInAudience {
  return role === "STUDENT" ? "STUDENT" : "STAFF";
}

/** The sign-in route belonging to whoever holds this role. */
export function signInRouteFor(role: UserRole): string {
  return role === "STUDENT" ? STUDENT_SIGN_IN_ROUTE : STAFF_SIGN_IN_ROUTE;
}

/** The door that serves this audience. The inverse of `audienceFor`. */
export function routeForAudience(audience: SignInAudience): string {
  return audience === "STUDENT" ? STUDENT_SIGN_IN_ROUTE : STAFF_SIGN_IN_ROUTE;
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
