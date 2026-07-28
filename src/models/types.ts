// ============================================================================
// MODEL LAYER — Shared type contract
// Mirrors CONTRACT.md sections 1-3 EXACTLY. Do not rename fields or change
// enum values. This is the single source of truth shared with the NestJS
// backend (AlphaCI-Educ-be).
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Enums (as string-literal unions; values are the binding wire format)
// ---------------------------------------------------------------------------
/**
 * SUPER_ADMIN is the PLATFORM operator (the vendor), not a school role. It is
 * resolved from a team in the dedicated platform GitHub org — never from a
 * customer lab's org — and passes every check ADMIN passes, in every lab.
 */
export type UserRole = "STUDENT" | "TEACHER" | "ADMIN" | "SUPER_ADMIN";

/** Roles that administer a laboratory: the school's IT admin, or the vendor. */
export function isAdminRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Roles that belong to a staff area (anything that isn't a student). */
export function isStaffRole(role: UserRole): boolean {
  return role !== "STUDENT";
}
export type UserStatus = "ACTIVE" | "ARCHIVED" | "ANONYMIZED";
export type EnrollmentRole = "TEACHER" | "STUDENT";
export type RepoStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED" | "ARCHIVED";
export type PipelineStatus = "QUEUED" | "RUNNING" | "PASSED" | "FAILED";
export type PipelineStage =
  | "SANDBOX"
  | "LINT"
  | "PUBLIC_TESTS"
  | "HIDDEN_TESTS"
  | "SCORING";
export type CheckStatus = "PASS" | "FAIL" | "WARN";
export type PlagiarismStatus = "CLEAR" | "FLAGGED";

// ADDENDUM A — GitHub Team & Role Hierarchy (plan §2, 4-tier)
export type GithubTeamType = "ORG_OWNERS" | "FACULTY" | "CLASS";
export type GithubRole = "OWNER" | "MAINTAINER" | "MEMBER";

// ADDENDUM G — project scaffold stack + repo layout
export type Stack =
  | "nodejs"
  | "nestjs"
  | "nextjs"
  | "react"
  // Backend-only. Valid for a SINGLE project and for the BACKEND half of a
  // SPLIT one; deliberately absent from FRONTEND_STACK_OPTIONS so a split
  // project can never scaffold a PHP "frontend" repository.
  | "java"
  | "python"
  | "php";
export type ProjectRepoStructure = "SINGLE" | "SPLIT";
export type RepoComponent = "SINGLE" | "BACKEND" | "FRONTEND";

// Ordered list of the 5 pipeline stages, for stable UI rendering.
export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  "SANDBOX",
  "LINT",
  "PUBLIC_TESTS",
  "HIDDEN_TESTS",
  "SCORING",
];

// ---------------------------------------------------------------------------
// 2. Entities / DTO shapes
// ---------------------------------------------------------------------------
export interface UniversityOrganization {
  id: string;
  name: string; // "State University"
  githubOrgName: string; // "state-university"
  githubInstallationId: string; // crucial for App Tokens
  ssoProvider: string; // "Azure AD" | "Okta" | "Google Workspace"
  githubAppInstalled: boolean;
  scimEnabled: boolean;
  createdAt: string;
}

export interface SystemUser {
  id: string; // sso_uuid
  fullName: string;
  email: string;
  role: UserRole;
  orgId: string;
  personalGithubUsername: string | null; // nullable — for home access
  status: UserStatus;
  avatarColor: string; // hex, for UI avatars e.g. "#0e76a8"
  createdAt: string;
  // ADDENDUM A — org-seat GitHub identity (additive, backward-compatible)
  githubUsername: string | null; // org-seat handle for TEACHER/ADMIN; null for students
  consumesGithubSeat: boolean; // true for TEACHER & ADMIN, false for STUDENT
  // ADDENDUM B — real GitHub OAuth identity (teacher-only; null for students).
  //
  // These are NOT rendered anywhere in the UI any more: the platform still uses
  // GitHub as its source host, but no role sees the organization, its teams, or
  // anyone's handle. They remain on the type because the app uses them as
  // signals — githubLogin doubles as "this staff member has actually signed in"
  // on the admin teacher directory, and githubAvatarUrl is shown as a plain
  // profile photo with no attribution.
  githubLogin: string | null;
  githubAvatarUrl: string | null;
  githubProfileUrl: string | null;
  // Supabase Auth link + last successful sign-in. Undefined for a rostered
  // person who has never set a password.
  authUserId?: string | null;
  lastSignInAt?: string;
  /** Last authenticated request — the "online now" heartbeat. In-memory on the
   *  API, so it resets when the backend restarts. */
  lastSeenAt?: string;
}

/**
 * One row of the IT-Admin student monitor (GET /organizations/:id/students).
 * A narrow projection of SystemUser — the API deliberately withholds auth ids
 * and source-host identity from this roster.
 */
export interface StudentAccountSummary {
  id: string;
  fullName: string;
  email: string;
  avatarColor: string;
  status: UserStatus;
  lastSignInAt: string | null;
  lastSeenAt: string | null;
  classNames: string[];
  activeProjects: number;
  createdAt: string;
}

// ADDENDUM H — Course catalog + IT-Admin-driven instructor assignment.
// A Course is the catalog unit ("CS-101"); IT Admins create courses and invite
// teachers onto them. A CourseInstructor edge lets a teacher create classes
// under that course — it does NOT reveal other teachers' classes (that stays
// scoped by ClassEnrollment). See the backend contract for the full note.
export interface Course {
  id: string;
  orgId: string;
  code: string; // "CS-101"
  title: string; // "Introduction to Programming"
  description: string;
  createdByAdminId: string;
  createdAt: string;
}

export interface CourseInstructor {
  id: string;
  courseId: string;
  userId: string; // TEACHER granted access
  invitedByAdminId: string;
  createdAt: string;
}

export interface CourseWithInstructors extends Course {
  instructors: SystemUser[];
  classCount: number;
}

export interface ClassCohort {
  id: string;
  orgId: string;
  courseId: string; // ADDENDUM H — catalog Course this class is a section of
  name: string; // "CS-101 Fall 2026"
  code: string; // "CS-101"
  section: string; // explicit cohort boundary within a course/term
  term: string; // "Fall 2026"
  githubTeamSlug: string; // "state-univ-eng/cs101-fall2026"
  /**
   * Laboratories this class physically meets in, as organization ids.
   *
   * Separate from `orgId`, which is the single lab that owns the course and
   * stores the GitHub repositories. This answers "where does the class sit",
   * which can be several places — including labs other than the owning one.
   * Descriptive only; keeping it on ONE class is what stops a cohort that moves
   * between labs from becoming two records with two gradebooks.
   */
  meetingLabOrgIds?: string[];
  createdAt: string;
  // ADDENDUM D — magic join code (teacher writes it on the whiteboard)
  magicJoinCode: string; // e.g. "CS101-XYZ"
  joinCodeExpiresAt: string | null; // optional TTL; null = no expiry
  joinCodeActive: boolean; // teacher can disable joining
}

// ---------------------------------------------------------------------------
// Hidden tests — the teacher's own suite, which students must not read.
// Mirrors AlphaCI-Educ-be/src/domain/types.ts.
// ---------------------------------------------------------------------------
export type HiddenTestMode = "ci" | "secure";

export interface HiddenTestFile {
  /** Path relative to the language's inject directory, e.g. "test_edges.py". */
  path: string;
  /** Test source. Never renders in a student-reachable view. */
  content: string;
}

export interface HiddenTestSuite {
  id: string;
  assignmentId: string;
  version: number;
  files: HiddenTestFile[];
  hints: string[];
  mode: HiddenTestMode;
  revealAfterDue: boolean;
  showFailureHints: boolean;
  uploadedByUserId: string;
  uploadedAt: string;
}

/** Counts and settings, never file content. */
export interface HiddenTestSuiteSummary {
  assignmentId: string;
  version: number;
  fileCount: number;
  mode: HiddenTestMode;
  revealAfterDue: boolean;
  showFailureHints: boolean;
  uploadedAt: string;
  /** True once the due date has passed and revealAfterDue is set. */
  revealed: boolean;
}

export interface UploadHiddenTestsInput {
  files: HiddenTestFile[];
  hints?: string[];
  mode?: HiddenTestMode;
  revealAfterDue?: boolean;
  showFailureHints?: boolean;
}

export interface ClassEnrollment {
  id: string;
  userId: string;
  classId: string;
  role: EnrollmentRole;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string; // "Python Calculator"
  description: string;
  templateGithubUrl: string;
  dueDate: string;
  points: number; // total possible, e.g. 100
  isGroup: boolean; // group project vs solo
  createdAt: string;
  // ADDENDUM L — set when a teacher ENDS (closes) the project. When present,
  // students can't start a lab session, get a token, or submit. null = open.
  closedAt?: string | null;
  /**
   * When the teacher published marks for this project; undefined while they are
   * withheld.
   *
   * The backend already redacts `repo.grade` for students until this is set, so
   * the UI cannot leak a mark by forgetting to check. This field exists so the
   * UI can explain WHY a grade is missing — a withheld mark and an ungraded
   * repository both arrive as `grade: null`, and telling a student "not graded
   * yet" when their work HAS been assessed is misleading.
   */
  gradesReleasedAt?: string;
}

export interface AssignmentRepository {
  id: string;
  assignmentId: string;
  ownerUserId: string | null; // primary student owner (null for pure team)
  repoName: string; // "cs101-fall26-pythoncalc-johndoe"
  githubRepoUrl: string;
  status: RepoStatus;
  grade: number | null; // 0..points
  teacherFeedback: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  createdAt: string;
  // ADDENDUM G — which side of a SPLIT project this repo is (SINGLE otherwise)
  component?: RepoComponent;
  stack?: Stack; // the language/framework scaffolded into this repo
}

export interface RepositoryCollaborator {
  // group-project join
  id: string;
  repoId: string;
  studentId: string;
}

export interface HardwarePc {
  id: string;
  orgId: string;
  pcName: string; // "PC-45"
  location: string; // "Lab 101"
}

export interface PipelineRun {
  id: string;
  repoId: string;
  commitSha: string; // short sha
  commitMessage?: string; // commit message
  branch: string; // "main" | "feature-auth"
  status: PipelineStatus;
  score: number | null; // percentage 0..100 (partial credit)
  passedTests: number;
  totalTests: number;
  logUrl: string; // mock S3 pointer
  startedAt: string;
  finishedAt: string | null;
}

export interface PipelineCheck {
  // one row per stage of the 5-stage pipeline
  id: string;
  runId: string;
  stage: PipelineStage;
  name: string; // "PEP8 Style", "Public: test_add", "Hidden: edge cases"
  status: CheckStatus;
  message: string; // human-readable error hint, e.g. "Missing semicolon on line 42"
  pointsAwarded: number;
  pointsPossible: number;
  isHidden: boolean; // hidden tests: message masked for students
}

export interface PlagiarismFlag {
  id: string;
  repoId: string;
  comparedRepoId: string;
  comparedStudentName: string;
  similarity: number; // 0..100
  status: PlagiarismStatus;
}

// Branch info (mocked) for student workspace view
export interface RepoBranch {
  name: string; // "main", "feature-auth"
  lastCommitSha: string;
  lastCommitMessage: string;
  ahead: number;
  isProtected: boolean;
}

// --- ADDENDUM A — GitHub Team & Role Hierarchy ----------------------------
// Represents WHERE teachers/admins sit inside the university's single GitHub
// org. Students are NEVER team members (zero-footprint); they appear only as
// Outside Collaborators via personalGithubUsername.
export interface GithubTeam {
  id: string;
  orgId: string;
  slug: string; // "it-admins" | "faculty" | "cs101-fall2026"
  name: string; // "IT Admins" | "Faculty" | "CS-101 Fall 2026"
  type: GithubTeamType; // ORG_OWNERS | FACULTY | CLASS
  classId: string | null; // set only when type === 'CLASS' (links ClassCohort)
  tier: number; // 1 = org owners, 2 = faculty/class-maintainers, 3 = class teams
}

export interface GithubTeamMembership {
  id: string;
  teamId: string;
  userId: string; // TEACHER or ADMIN only — never a STUDENT
  githubRole: GithubRole; // OWNER (it-admins) | MAINTAINER (class team) | MEMBER (faculty)
}

// Aggregate for the Admin hierarchy view
export interface GithubTeamWithMembers extends GithubTeam {
  members: Array<{ user: SystemUser; githubRole: GithubRole }>;
}

// ---------------------------------------------------------------------------
// 3. Aggregate / view-model response shapes
// ---------------------------------------------------------------------------
export interface TeacherDashboard {
  teacher: SystemUser;
  classes: Array<
    ClassCohort & {
      studentCount: number;
      assignmentCount: number;
      pendingGrading: number; // repos SUBMITTED not yet GRADED
    }
  >;
}

export interface StudentDashboard {
  student: SystemUser;
  // ADDENDUM D — every class the student is enrolled in (multi-class hub)
  classes: ClassCohort[];
  assignments: Array<{
    assignment: Assignment;
    className: string;
    classId: string; // ADDENDUM D — lets the hub filter by selected class
    repo: AssignmentRepository | null;
    latestRun: PipelineRun | null;
  }>;
}

export interface ClassRoster {
  classInfo: ClassCohort;
  teachers: SystemUser[];
  students: Array<
    SystemUser & {
      repoCount: number;
      submittedCount: number;
      gradedCount: number;
      avgGrade: number | null;
    }
  >;
}

export interface RepositoryDetail {
  repo: AssignmentRepository;
  assignment: Assignment;
  owner: SystemUser | null;
  collaborators: SystemUser[]; // group members
  branches: RepoBranch[];
  runs: PipelineRun[];
  plagiarism: PlagiarismFlag[];
}

export interface PipelineRunDetail {
  run: PipelineRun;
  checks: PipelineCheck[];
}

// ---------------------------------------------------------------------------
// Platform (SUPER_ADMIN) console — cross-lab operational view.
// ---------------------------------------------------------------------------

/** One laboratory's operational vitals, as the platform operator sees them. */
export interface PlatformLabSummary {
  orgId: string;
  orgName: string;
  githubOrgName: string;
  sourceHostingConnected: boolean;
  admins: number;
  teachers: number;
  students: number;
  courses: number;
  classes: number;
  totalProjects: number;
  activeProjects: number;
  archivedProjects: number;
  pipelineRuns: number;
  /** Runs whose status is FAILED — the "errors" signal an operator watches. */
  failedRuns: number;
  flaggedPlagiarism: number;
}

/**
 * One person anywhere on the platform. Presence is deliberately NOT classified
 * server-side — the raw timestamps travel and the ViewModel applies the single
 * presence policy in viewmodels/presence.ts.
 */
export interface PlatformPerson {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  orgId: string;
  orgName: string;
  avatarColor: string;
  lastSignInAt: string | null;
  lastSeenAt: string | null;
}

export interface PlatformOverview {
  generatedAt: string;
  labs: PlatformLabSummary[];
  people: PlatformPerson[];
  totals: {
    labs: number;
    admins: number;
    teachers: number;
    students: number;
    classes: number;
    projects: number;
    activeProjects: number;
    failedRuns: number;
    flaggedPlagiarism: number;
  };
}

export interface AdminOverview {
  org: UniversityOrganization;
  githubAppInstalled: boolean;
  ssoProvider: string;
  scimEnabled: boolean;
  stats: {
    totalStudents: number; // zero-footprint (not GitHub seats)
    totalTeachers: number;
    totalClasses: number;
    totalRepositories: number;
    activeRepositories: number;
    archivedRepositories: number;
    seatsSaved: number; // = totalStudents (outside billing)
    estimatedSeatSavingsUsd: number; // seatsSaved * 21
    labPcs: number;
    // ADDENDUM A — GitHub seats consumed = totalTeachers + totalAdmins
    githubSeatsUsed: number;
  };
  itAdmins: SystemUser[];
  labPcs: HardwarePc[];
  // ADDENDUM A — full 4-tier GitHub team hierarchy (orderable by tier then name)
  githubTeams: GithubTeamWithMembers[];
}

// ---------------------------------------------------------------------------
// Auth response shapes (section 4)
// ---------------------------------------------------------------------------
export interface AuthLoginResponse {
  token: string;
  user: SystemUser;
}

// Real email + password sign-in. Credentials are verified by Supabase Auth
// (auth.users) server-side; the browser only ever posts them to our API over
// HTTPS and receives a session back — it never talks to Supabase directly, and
// no password ever reaches localStorage.
export interface PasswordLoginRequest {
  email: string;
  password: string;
}

/**
 * Which sign-in door the credentials were presented at. The API rejects a
 * mismatch (a student's password at the staff door and vice versa) so that a
 * wrong-door attempt produces a clear "use the other page" message instead of
 * silently landing someone on a dashboard they can't use.
 */
export type SignInAudience = "STUDENT" | "STAFF";

// ---------------------------------------------------------------------------
// Admin — add a teacher (POST /organizations/:id/teachers)
//
// Name and email only. There is no GitHub field by design: the platform still
// uses GitHub as the source host, but an admin never sees or types anything
// about it — the org + Teacher-team invitation goes out by email server-side.
// ---------------------------------------------------------------------------
export interface AddTeacherRequest {
  fullName: string;
  email: string;
  /**
   * REQUIRED. Pins WHICH GitHub account may later link to this profile, and is
   * the only invite form the GitHub App itself can send — an email-only invite
   * would need a signed-in admin's own GitHub token.
   */
  githubUsername: string;
}

/** Same shape for both rungs of the chain — operator adds admin, admin adds teacher. */
export type AddStaffRequest = AddTeacherRequest;

/** DELETE /organizations/:id/teachers/:userId */
export interface RemoveStaffResponse {
  /** The deleted record, returned so the UI can name who went. */
  user: SystemUser;
  orgRemoval: {
    /** true when a real GitHub call was made (vs. simulated with no token). */
    live: boolean;
    removed: boolean;
    /** They had no GitHub account, so there was nothing in the org to remove. */
    nothingToRemove?: boolean;
    warning?: string;
  };
  /**
   * false when they still teach at another laboratory: they were DETACHED from
   * this one, not deleted. Their account and the other lab's data are untouched.
   */
  accountDeleted: boolean;
  /** What was deleted alongside them, SCOPED TO THIS LABORATORY. */
  cascade: {
    classes: number;
    assignments: number;
    repositories: number;
    enrollments: number;
  };
}

/** POST /organizations/:id/staff/reconcile */
export interface ReconcileResponse {
  /** false when GitHub could not be read — in which case NOTHING was changed. */
  live: boolean;
  checked: number;
  archived: SystemUser[];
  /** Staff with no known GitHub handle, so nothing to compare against. */
  skippedNoHandle: number;
  warning?: string;
}

/**
 * A teacher who already exists on the platform but is not in the laboratory
 * being added to — offered so the admin can pick instead of retyping.
 */
export interface TransferableTeacher {
  id: string;
  fullName: string;
  email: string;
  /** The handle they are already bound to. Must be reused verbatim. */
  githubUsername: string | null;
  /** true once they have proved they own that GitHub account. */
  githubLinked: boolean;
  avatarColor: string;
  /** Laboratories they already teach at, by name. */
  labNames: string[];
}

export interface AddTeacherResponse {
  teacher: SystemUser;
  /**
   * true when this address already had an account at another laboratory and was
   * ATTACHED here rather than created — no new profile, no password email.
   */
  attachedExisting: boolean;
  /**
   * Whether source-host access actually went out. Reported rather than assumed
   * because the profile is created even when the invite fails — the admin needs
   * to know which half succeeded.
   */
  accessInvite: {
    sent: boolean;
    alreadyHadAccess: boolean;
    live: boolean;
    warning?: string;
  };
  /** Whether a set-your-password email was sent. */
  passwordInviteSent: boolean;
}

// ADDENDUM K — multi-lab (multi-org). A lab/organization a signed-in staff
// user may work in, and the response for GET /auth/labs · POST /auth/select-lab.
export interface AccessibleLab {
  id: string;
  name: string;
  githubOrgName: string;
}
export interface LabsResponse {
  labs: AccessibleLab[];
  selectedOrgId: string | null;
}

// Lab Session handoff (docs/LAB_SESSION_HANDOFF_PLAN.md) — POST
// /repositories/:id/session. Carries only a deep link (single-use claim), never
// a token. `live:false` = simulated (GitHub not enabled) → show manual fallback.
export interface StartSessionResponse {
  deepLink: string;
  live: boolean;
  /** When the CURRENT GitHub token lapses (~1h). Refreshed silently — NOT the
   *  end of the student's work, and not the thing to count down to. */
  tokenExpiresAt: string;
  /** Epoch ms when the session window closes. THIS is the student's deadline. */
  sessionExpiresAt: number;
  /** Granted window in hours, after the server clamped it. */
  sessionHours?: number;
  /** Server ceiling, so a clamped value can be explained rather than just shown. */
  maxSessionHours?: number;
  fallbackAvailable: boolean;
}

// --- Lab PC setup (IT Admin) ------------------------------------------------
// Every prerequisite for the one-click VS Code handoff, verified server-side.
// `ok: false` always carries a `fix` — these are next actions, not diagnostics.
export interface LabSetupCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  fix?: string;
}

export interface LabSetupInfo {
  org: { id: string; name: string; githubOrgName: string };
  /** The API base a lab PC must be pointed at, derived from this deployment. */
  backendUrl: string;
  extensionId: string;
  /** vscode:extension/... — opens the extension in VS Code once published. */
  extensionInstallUrl: string;
  checks: LabSetupCheck[];
  ready: boolean;
  session: { maxSessionHours: number; claimTtlSec: number };
  generatedAt: string;
}

// Bounds for the lab-session length a teacher may choose (GET /session/limits).
export interface LabSessionLimits {
  defaultSessionHours: number;
  maxSessionHours: number;
  minSessionHours: number;
  /** Fixed at 60 by GitHub. Exposed so the UI never implies it is adjustable. */
  tokenLifetimeMinutes: number;
  handoffEnabled: boolean;
}

// ADDENDUM M — LIVE repo activity straight from GitHub (what the student sees
// after they push): real branches, commits and Actions workflow runs.
export interface GithubBranchInfo {
  name: string;
  sha: string;
  protected: boolean;
}
export interface GithubCommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string | null;
  url: string;
}
export interface GithubWorkflowStep {
  name: string;
  status: string;
  conclusion: string | null;
}
export interface GithubWorkflowJob {
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
  steps: GithubWorkflowStep[];
}
export interface GithubWorkflowRunInfo {
  id: number;
  name: string;
  status: string; // queued | in_progress | completed
  conclusion: string | null; // success | failure | cancelled | ...
  branch: string;
  sha: string;
  event: string;
  createdAt: string;
  url: string;
  jobs: GithubWorkflowJob[]; // newest run only
}
export interface GithubRepoActivity {
  live: boolean;
  defaultBranch: string | null;
  branches: GithubBranchInfo[];
  commits: GithubCommitInfo[];
  workflowRuns: GithubWorkflowRunInfo[];
  error: string | null;
}

// ADDENDUM B — GitHub App (gated). Every GitHub op carries `live`: false while
// GitHub runs in SIMULATED mode, true once the backend env flag is flipped.
export interface LabToken {
  token: string;
  expiresAt: string;
  repoUrl: string;
  cloneUrl: string; // e.g. "github.com/state-university/cs101-...-johndoe.git"
  live: boolean; // false = simulated, true = real GitHub App token
}

// ADDENDUM D — where a provisioned repo is created.
// TEACHER = under the logged-in teacher's own GitHub account (their persona),
// ORG     = under the education org (falls back to TEACHER on 403).
export type RepoOwnerMode = "TEACHER" | "ORG";

// ADDENDUM B — CI/CD scaffold pushed to a freshly created repo ("like alphaci").
// --- GitHub connection (verified, not inferred) -----------------------------
// `linked` is identity — a GitHub account was attached to this profile at some
// point. `connected` is the credential — this server holds a token GitHub
// accepted moments ago. Only the second one predicts whether provisioning will
// work, and the two can disagree, which is exactly the state that used to be
// invisible.
export type GithubConnectionState =
  | "connected"
  | "never_connected"
  | "credential_missing"
  | "revoked"
  | "unconfigured"
  | "check_failed"
  | "not_applicable";

export interface GithubConnectionStatus {
  linked: boolean;
  login: string | null;
  connected: boolean;
  state: GithubConnectionState;
  scopes: string[];
  /** Valid token AND the `repo` scope — the real precondition for provisioning. */
  canCreateRepos: boolean;
  checkedAt: string;
}

export interface RepoScaffold {
  files: string[]; // scaffold file paths, e.g. ["package.json", ".github/workflows/ci.yml"]
  stack: string; // e.g. "nodejs"
}

// Result of teacher-triggered bulk provisioning for an assignment. When a
// teacher is GitHub-authenticated the repos are REAL (live:true) and a scaffold
// summary (same stack for all) accompanies the created repos.
// One repository the backend could not finish. A non-empty `failures` list on
// ProvisionResult means PARTIAL success — the repos in `created` are real, these
// are not, and calling provisioning again retries exactly these.
export interface ProvisionFailure {
  repoId: string;
  repoName: string;
  reason: string;
}

export interface ProvisionResult {
  live: boolean;
  created: AssignmentRepository[];
  skipped: number;
  failures?: ProvisionFailure[];
  defaultBranch?: string; // e.g. "main"
  scaffold?: RepoScaffold;
  // ADDENDUM D — where the repos landed
  ownerLogin?: string; // GitHub login owning the created repos
  ownerMode?: RepoOwnerMode; // TEACHER = teacher's own account, ORG = education org
  ownerFallback?: boolean; // true when ORG was requested but fell back to TEACHER
}

// Result of provisioning a single repository record (ADDENDUM B shape):
// wraps the updated repo plus the default branch, scaffold summary, and live flag.
export interface ProvisionRepositoryResult {
  repo: AssignmentRepository;
  defaultBranch: string;
  scaffold: RepoScaffold;
  live: boolean;
  // ADDENDUM D — where the repo landed
  ownerLogin?: string;
  ownerMode?: RepoOwnerMode;
  ownerFallback?: boolean;
}

export interface ArchiveSemesterResponse {
  archived: number;
}

// --- ADDENDUM E — Teacher creates a class -----------------------------------
// The backend auto-generates the magicJoinCode and enrolls the creating teacher.
// ADDENDUM H — a teacher now creates a class UNDER a course they were invited
// to. The course supplies code/title/org; the teacher supplies section + term.
export interface CreateClassInput {
  courseId: string; // must be a course this teacher is an instructor of
  section: string; // e.g. "A"
  term: string; // e.g. "Fall 2026"
  name?: string; // optional display name; defaults to the course title
  meetingLabOrgIds?: string[]; // optional laboratories the class meets in
}

// IT-Admin create-course + invite-instructor inputs.
export interface CreateCourseInput {
  code: string; // "CS-101"
  title: string; // "Introduction to Programming"
  description?: string;
  orgId?: string; // defaults to the single seeded org
}

export interface AddInstructorInput {
  teacherId: string;
}

// --- ADDENDUM D — Magic join code (whiteboard flow) -------------------------
export interface JoinCode {
  code: string; // "CS101-XYZ"
  expiresAt: string | null; // null = no expiry
  active: boolean; // teacher can disable joining
}

// GET /classes/:id/join-code additionally returns a shareable join URL.
export interface JoinCodeInfo extends JoinCode {
  joinUrl: string;
}

export interface JoinCodeToggleResult {
  active: boolean;
}

// POST /classes/join — idempotent; alreadyEnrolled=true when re-joining.
export interface JoinClassResult {
  class: ClassCohort;
  enrollment: ClassEnrollment;
  alreadyEnrolled: boolean;
}

// --- ADDENDUM C — Teacher "Create Project" (solo assignment / group project) --
export type ProjectType = "SOLO" | "GROUP";

export interface CreateProjectGroup {
  name?: string;
  studentIds: string[]; // 2..4 students; a student may be in only one group
}

// Mirrors the POST /classes/:id/assignments body exactly.
export interface CreateProjectInput {
  title: string;
  description: string;
  templateGithubUrl?: string; // optional starter template
  dueDate: string; // ISO
  points: number; // default 100
  type: ProjectType;
  isPrivate?: boolean; // ADDENDUM N — repo visibility; default PUBLIC (false)
  studentIds?: string[]; // SOLO — which enrolled students get a repo
  groups?: CreateProjectGroup[]; // GROUP — the groups to form
  // ADDENDUM G — repo scaffold options
  repoStructure?: ProjectRepoStructure; // default SINGLE
  stack?: Stack; // SINGLE: language/framework (default 'nodejs')
  backendStack?: Stack; // SPLIT: backend repo stack (default 'nestjs')
  frontendStack?: Stack; // SPLIT: frontend repo stack (default 'nextjs')
  coverageThreshold?: number; // CI coverage gate, int 0..100 (default 80)
  /**
   * How long a student's lab session may last, in hours. Omitted = server
   * default. NOT the GitHub token lifetime, which is fixed at 60 minutes.
   */
  labSessionHours?: number;
}

// Response of the create-assignment endpoint (DB records; repos are placeholder
// until provisioned via ADDENDUM B).
export interface CreateAssignmentResult {
  assignment: Assignment;
  repositories: AssignmentRepository[];
}
