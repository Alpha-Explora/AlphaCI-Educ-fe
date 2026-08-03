"use client";
// ============================================================================
// VIEWMODEL LAYER — Create Project (teacher, ADDENDUM C)
// Owns validation + the create → provision SEQUENCE + cache invalidation.
//   1. validate the CreateProjectInput (SOLO: ≥1 student; GROUP: each group
//      2–4 students, no student in two groups)
//   2. POST create assignment → DB repo records
//   3. POST provision-repositories → real GitHub repos + CI/CD scaffold
//   4. invalidate class assignments + roster + teacher dashboards
// Views keep the form state; they call submit(input) and render the result.
// ============================================================================
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi, classesApi, sessionApi } from "@/models/api";
import type {
  Assignment,
  AssignmentRepository,
  BranchStrategy,
  CreateProjectInput,
  LabSessionLimits,
  ProjectRepoStructure,
  ProjectTemplateOption,
  ProvisionFailure,
  RepoOwnerMode,
  RepoScaffold,
  Stack,
} from "@/models/types";
import { queryKeys } from "./queryKeys";
import { reportGithubLive } from "./useGithubMode";
import { toPresentableError, type PresentableError } from "./errors";

export const GROUP_MIN = 2;
export const GROUP_MAX = 4;
export const DEFAULT_COVERAGE = 80;

export const DEFAULT_POINTS = 100;

/**
 * Common assignment totals, offered as a shortcut — NOT as the whole range.
 *
 * Unlike coverage, points has no canonical scale: the figure comes from the
 * institution's own grading scheme, so a closed list would make a 25-point lab
 * or a 75-point project inexpressible. Hence the Custom escape hatch in the
 * View. This list is only "what most teachers pick", ordered low to high.
 */
export const POINTS_OPTIONS: ReadonlyArray<number> = [20, 40, 50, 60, 80, 100, 150, 200];

/**
 * Does the backend's rubric divide this total without rounding?
 *
 * rubricFor (ci.service.ts) awards each stage `Math.round(total * fraction)`
 * using the shares below, so a total those fractions cannot divide leaves a
 * mark or two hanging on rounding — 50 points yields 5/8/15/13, which sums to
 * 41 where 40 was intended. 15% is the binding share, so in practice this is
 * "a multiple of 20", but deriving it from the shares keeps the two in step if
 * the weighting is ever retuned.
 *
 * Percentages, not decimals, on purpose: `points * 15 % 100` is exact integer
 * arithmetic, where `points * 0.15` is subject to float error.
 */
const RUBRIC_SHARE_PERCENTS: ReadonlyArray<number> = [10, 15, 30, 25];

export function rubricSplitsEvenly(points: number): boolean {
  if (!Number.isInteger(points) || points <= 0) return false;
  return RUBRIC_SHARE_PERCENTS.every((pct) => (points * pct) % 100 === 0);
}

/**
 * ADDENDUM G — the coverage thresholds a teacher may pick from.
 *
 * A free number box accepted 83, or 8 meant as 80. Both look deliberate and
 * neither is: the figure is baked into the student's jest.config.ts as a build
 * gate AND spread into the grading rubric (branches at −10, functions at −5),
 * so an off-by-one keystroke silently rewrites how a class is marked. A fixed
 * ladder turns the field into a policy choice — lenient, recommended, strict —
 * and removes the typo class the validator existed to catch.
 *
 * 0 stays on the list deliberately. An early project where tests are not yet
 * the point needs an honest way to say "no gate", rather than a threshold set
 * so low it pretends to be one.
 */
export const COVERAGE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: "No minimum" },
  { value: 50, label: "50%" },
  { value: 60, label: "60%" },
  { value: 70, label: "70%" },
  { value: 80, label: "80% (recommended)" },
  { value: 90, label: "90%" },
  { value: 100, label: "100%" },
];

// ADDENDUM G — stack option metadata for the language selects.
export const STACK_OPTIONS: ReadonlyArray<{ value: Stack; label: string }> = [
  { value: "nodejs", label: "Node.js" },
  { value: "nestjs", label: "NestJS" },
  { value: "nextjs", label: "Next.js" },
  { value: "react", label: "React" },
  { value: "java", label: "Java (Maven)" },
  { value: "python", label: "Python" },
  { value: "php", label: "PHP" },
];

/**
 * A SPLIT project scaffolds two repositories, and each half gets its own
 * language. Java, Python and PHP are backend runtimes with no browser build, so
 * they appear here and never in FRONTEND_STACK_OPTIONS — offering "PHP" as a
 * frontend would generate a repository the pipeline has no way to build.
 */
const BACKEND_STACKS: ReadonlyArray<Stack> = ["nodejs", "nestjs", "java", "python", "php"];
const FRONTEND_STACKS: ReadonlyArray<Stack> = ["nextjs", "react"];

export const BACKEND_STACK_OPTIONS = STACK_OPTIONS.filter((o) =>
  BACKEND_STACKS.includes(o.value),
);
export const FRONTEND_STACK_OPTIONS = STACK_OPTIONS.filter((o) =>
  FRONTEND_STACKS.includes(o.value),
);

/**
 * What the teacher is actually choosing when they set up a project.
 *
 * The API models this as `repoStructure: SINGLE | SPLIT` plus a language, which
 * is the right shape for the server and the wrong one for the person filling in
 * the form: "Single repo" does not tell a teacher that picking React there is
 * how you set a frontend-only project. Naming the three real cases makes the
 * frontend-only route findable instead of implied.
 *
 * BACKEND and FRONTEND both map to SINGLE — the difference is only which
 * languages the picker then offers.
 */
export type ProjectShape = "BACKEND" | "FRONTEND" | "SPLIT";

export const PROJECT_SHAPE_OPTIONS: ReadonlyArray<{
  value: ProjectShape;
  label: string;
  hint: string;
}> = [
  {
    value: "BACKEND",
    label: "Backend only",
    hint: "One repository. An API or console project in Node, NestJS, Java, Python or PHP.",
  },
  {
    value: "FRONTEND",
    label: "Frontend only",
    hint: "One repository. A React or Next.js interface, with component tests.",
  },
  {
    value: "SPLIT",
    label: "Backend + Frontend",
    hint: "Two repositories per student or group, each with its own language.",
  },
];

export function repoStructureForShape(shape: ProjectShape): ProjectRepoStructure {
  return shape === "SPLIT" ? "SPLIT" : "SINGLE";
}

/** Which languages the single-repo picker offers for this half of the stack. */
export function stackOptionsForShape(shape: ProjectShape) {
  return shape === "FRONTEND" ? FRONTEND_STACK_OPTIONS : BACKEND_STACK_OPTIONS;
}

/**
 * The language to fall back to when the shape changes.
 *
 * Switching to "Frontend only" while `stack` still says `python` would leave a
 * select whose value is not in its own option list — which renders blank and
 * submits the old value.
 */
export function defaultStackForShape(shape: ProjectShape): Stack {
  return shape === "FRONTEND" ? "nextjs" : "nodejs";
}

// ---- Pure validation helpers (exported for inline hints in the View) --------

/** Per-group status used by the group-builder UI. */
export interface GroupValidity {
  ok: boolean;
  message: string | null;
}

export function validateGroup(studentIds: string[]): GroupValidity {
  if (studentIds.length < GROUP_MIN)
    return { ok: false, message: `Add ${GROUP_MIN - studentIds.length} more (min ${GROUP_MIN}).` };
  if (studentIds.length > GROUP_MAX)
    return { ok: false, message: `Too many — max ${GROUP_MAX} per group.` };
  return { ok: true, message: null };
}

/** Full validation of a CreateProjectInput → list of human-readable errors. */
export function validateCreateProject(input: CreateProjectInput): string[] {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push("Title is required.");
  // No due-date rule. A project without a deadline is legitimate — nothing is
  // ever "overdue" and hidden tests set to reveal after the due date simply
  // never reveal, which is what the backend's isPastDue already returns for an
  // absent date.
  // Whole numbers only, matching CreateAssignmentDto's @IsInt(). The old
  // `isFinite` check let 33.5 through to a 400 from the API — reachable now
  // that the points picker has a free-text Custom option.
  if (!Number.isInteger(input.points) || input.points <= 0)
    errors.push("Points must be a whole number greater than 0.");

  if (input.type === "SOLO") {
    if (!input.studentIds || input.studentIds.length === 0)
      errors.push("Select at least one student for a solo project.");
  } else {
    const groups = input.groups ?? [];
    if (groups.length === 0) errors.push("Add at least one group.");
    const seen = new Set<string>();
    groups.forEach((g, i) => {
      const v = validateGroup(g.studentIds);
      if (!v.ok) errors.push(`Group ${i + 1}: ${v.message}`);
      for (const sid of g.studentIds) {
        if (seen.has(sid))
          errors.push(`A student is assigned to more than one group.`);
        seen.add(sid);
      }
    });
  }

  // ADDENDUM G — coverage threshold must be an integer 0..100.
  const cov = input.coverageThreshold;
  if (cov !== undefined) {
    if (!Number.isInteger(cov) || cov < 0 || cov > 100)
      errors.push("Minimum test coverage must be a whole number between 0 and 100.");
  }

  // ADDENDUM G — SPLIT requires both backend and frontend stacks.
  if (input.repoStructure === "SPLIT") {
    if (!input.backendStack) errors.push("Choose a backend language.");
    if (!input.frontendStack) errors.push("Choose a frontend language.");
  }

  // De-duplicate (the "two groups" message can repeat).
  return [...new Set(errors)];
}

// ADDENDUM G — preview of the repo name(s) a student will get, so the teacher
// can see the -be/-fe split before submitting. Derivation lives in the VM.
export interface RepoNamePreview {
  component: "SINGLE" | "BACKEND" | "FRONTEND";
  name: string;
}

// The three helpers below MIRROR src/common/repo-name.util.ts on the backend,
// which is what actually names the repositories. They used to disagree: this
// file hyphenated words and showed only "<title>-group1", while the backend
// produces "<code>-section<section>-<term>-<title>-<holder>" with every part
// stripped of non-alphanumerics. So the preview promised a name that was never
// created — harmless-looking until a teacher searches GitHub for it.
//
// Any change to the backend convention has to be made here too; the preview is
// a promise about a name, so being approximately right is being wrong.

/** "IS-1234" -> "is1234" */
function slugifyAlnum(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** "Fall 2026" -> "fall26"; anything else falls back to a plain slug. */
function abbreviateTerm(term: string): string {
  const match = /([A-Za-z]+)\s+(\d{4})/.exec(term);
  if (!match) return slugifyAlnum(term);
  return `${match[1].toLowerCase()}${match[2].slice(-2)}`;
}

/** Titles are capped at 24 characters, exactly as the backend caps them. */
function slugifyAssignmentTitle(title: string): string {
  return slugifyAlnum(title).slice(0, 24);
}

export function repoNamePreview(
  input: Pick<CreateProjectInput, "title" | "repoStructure" | "type"> & {
    classCode?: string;
    section?: string;
    term?: string;
  },
  /** Stand-in for the student's full name, which differs per repo. */
  sampleStudentSlug = "studentname",
): RepoNamePreview[] {
  const holder = input.type === "GROUP" ? "group1" : sampleStudentSlug;
  const base = [
    slugifyAlnum(input.classCode ?? ""),
    input.section ? `section${slugifyAlnum(input.section)}` : "",
    abbreviateTerm(input.term ?? ""),
    slugifyAssignmentTitle(input.title) || "project",
    holder,
  ]
    .filter((part) => part.length > 0)
    .join("-");

  if (input.repoStructure === "SPLIT") {
    return [
      { component: "BACKEND", name: `${base}-be` },
      { component: "FRONTEND", name: `${base}-fe` },
    ];
  }
  return [{ component: "SINGLE", name: base }];
}

/**
 * The bounds a teacher may choose a lab-session length within.
 *
 * Fetched rather than hard-coded because the ceiling is an operator policy
 * (`LAB_MAX_SESSION_HOURS`) that differs per deployment — offering 12 hours in
 * a wizard on a server that clamps to 4 would be a promise the UI cannot keep.
 * Falls back to safe values so the field still works if the call fails.
 */
export function useLabSessionLimits(): LabSessionLimits {
  const query = useQuery({
    queryKey: ["session", "limits"],
    queryFn: () => sessionApi.limits(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  return (
    // Mirrors the server's own defaults in config/lab-session.config.ts
    // (LAB_MAX_SESSION_HOURS, 3). Being wrong here is not cosmetic: the number
    // is printed as "Maximum Nh, set by your IT administrator", so a stale
    // fallback offers a ceiling the server would then clamp.
    query.data ?? {
      defaultSessionHours: 3,
      maxSessionHours: 3,
      minSessionHours: 1,
      tokenLifetimeMinutes: 60,
      handoffEnabled: false,
    }
  );
}

/** The id used when the catalogue offers nothing for this stack. Mirrors the server. */
export const DEFAULT_TEMPLATE_ID = "calculator";

export interface StarterSelection {
  /** Starters offerable for the current stack, in teaching order. */
  options: ProjectTemplateOption[];
  isLoading: boolean;
  /** The effective choice — never an id absent from `options`. */
  selectedId: string | undefined;
  /** The chosen starter itself, for the card and the gallery's opening pane. */
  selected: ProjectTemplateOption | undefined;
  /** What the project should be called if the teacher has not named it. */
  suggestedTitle: string;
  /** What it should be described as if the teacher has not described it. */
  suggestedDescription: string;
}

/**
 * Everything about choosing a starter, in one ViewModel.
 *
 * The View owns FORM state (title, points, the student list) — that is this
 * wizard's established shape. What it must not own is DERIVED logic, and three
 * pieces of it had leaked in: falling back when the chosen starter does not
 * exist for the current language, resolving the id to the starter object, and
 * deciding what to prefill the title and description with.
 *
 * All three are rules, not keystrokes, so they belong here. The View keeps only
 * the two "has the teacher typed yet" flags and the effect that applies the
 * suggestions to its own state.
 */
export function useStarterSelection(
  stack: Stack | undefined,
  chosenId: string,
): StarterSelection {
  const query = useQuery({
    queryKey: ["assignments", "templates"],
    queryFn: () => assignmentsApi.templates(),
    staleTime: 10 * 60_000,
    retry: false,
  });

  // Empty, not invented, when the catalogue cannot be fetched. The picker then
  // hides itself and the server's own default applies — a teacher briefly not
  // seeing a choice is recoverable; one picking "Calendar" from a stale list and
  // receiving a calculator is not.
  const all = query.data ?? [];
  const options = stack ? all.filter((t) => t.supportedStacks.includes(stack)) : all;

  // The chosen starter may not exist for a language picked afterwards. Falling
  // back stops the card showing a name the repository will not contain.
  const selectedId = options.some((t) => t.id === chosenId)
    ? chosenId
    : options[0]?.id;
  const selected = options.find((t) => t.id === selectedId);

  return {
    options,
    isLoading: query.isLoading,
    selectedId,
    selected,
    suggestedTitle: selected?.label ?? "",
    suggestedDescription: selected?.summary ?? "",
  };
}

/**
 * The CI/CD difficulty dial, phrased for a teacher rather than for git.
 *
 * Neither option lets a student push to a graded branch. `main` is protected in
 * both, and a pull request the pipeline gates is the only way in — that is the
 * product. What changes is whether there is a SECOND hop: a `uat` stage to
 * promote through before main, which is what a real team runs and what a
 * first-year meeting pull requests for the first time does not also need.
 *
 * MAIN_ONLY leads because it is the right default for the years with the most
 * students; the server's own default is MAIN_UAT for backward compatibility
 * with projects created before this existed, which is a different question.
 */
export const BRANCH_STRATEGY_OPTIONS: ReadonlyArray<{
  value: BranchStrategy;
  label: string;
  flow: string;
  hint: string;
}> = [
  {
    value: "MAIN_ONLY",
    label: "Simple",
    flow: "branch → pull request → main",
    hint: "One protected branch. Students still branch and open a pull request that the pipeline has to pass — there is just no release stage to promote through. Best for 1st and 2nd year.",
  },
  {
    value: "MAIN_UAT",
    label: "Full pipeline",
    flow: "branch → pull request → uat → pull request → main",
    hint: "Adds a uat release stage between their work and main, gated by the pipeline at both merges. This is how a real team ships. Best for senior years and capstones.",
  },
];

// ---- ViewModel --------------------------------------------------------------

export type CreateProjectPhase =
  | "idle"
  | "creating"
  | "provisioning"
  // The project exists but its repositories do not. A distinct phase because
  // it is neither success nor failure and the two useful actions differ from
  // both: retry provisioning, or delete the half-made project.
  | "partial"
  | "success"
  | "error";

export interface CreateProjectResult {
  assignment: Assignment;
  repos: AssignmentRepository[];
  created: number;
  skipped: number;
  /** Repos the backend could not finish; non-empty means partial success. */
  failures: ProvisionFailure[];
  live: boolean;
  defaultBranch: string | null;
  scaffold: RepoScaffold | null;
  // ADDENDUM D — where the repos landed
  ownerLogin: string | null;
  ownerMode: RepoOwnerMode | null;
  ownerFallback: boolean;
}

export interface CreateProjectVM {
  submit: (input: CreateProjectInput) => void;
  phase: CreateProjectPhase;
  isSubmitting: boolean;
  validationErrors: string[];
  error: PresentableError | null;
  result: CreateProjectResult | null;
  reset: () => void;
  /**
   * Set once the assignment exists, whatever happened afterwards. The View
   * needs this to stop calling a created-but-unprovisioned project a failure:
   * it IS in the class list, and re-submitting the form only earns a duplicate
   * -title conflict.
   */
  createdAssignment: Assignment | null;
  /** Retry ONLY provisioning for the project that was already created. */
  retryProvision: () => void;
  /** Discard the half-made project, freeing its title for a fresh attempt. */
  discardCreated: () => void;
  isDiscarding: boolean;
  /** True when this failure is "your GitHub link is missing/rejected" (a 401). */
  needsGithubReconnect: boolean;
}

export function useCreateProject(classId: string | null): CreateProjectVM {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<CreateProjectPhase>("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  // The assignment, once the backend has really made it.
  //
  // A ref as well as state because the mutation body reads it: creating and
  // provisioning are two separate requests, and re-running the mutation after
  // the SECOND one failed must resume at provisioning. Re-creating would hit
  // the backend's duplicate-title conflict — which is exactly the dead end this
  // whole state exists to prevent.
  const createdRef = useRef<Assignment | null>(null);
  const [createdAssignment, setCreatedAssignment] = useState<Assignment | null>(null);

  const refreshClassViews = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.classes.assignments(classId ?? "none"),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.classes.roster(classId ?? "none"),
    });
    queryClient.invalidateQueries({ queryKey: ["classes"] });
    queryClient.invalidateQueries({ queryKey: ["dashboards", "teacher"] });
  };

  const mutation = useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      // Step 1 — create the assignment + repo records. Skipped on a retry: the
      // records already exist and are already visible in the class.
      let assignment = createdRef.current;
      if (!assignment) {
        setPhase("creating");
        const created = await classesApi.createAssignment(classId as string, input);
        assignment = created.assignment;
        createdRef.current = assignment;
        setCreatedAssignment(assignment);
        // Publish it NOW, before the step that can fail. The project is real
        // from this moment; leaving the class list stale until the very end is
        // what let a failed provision look like "nothing happened" while the
        // backend already held the row.
        refreshClassViews();
      }

      // Step 2 — provision the real GitHub repos + scaffold.
      setPhase("provisioning");
      const provision = await assignmentsApi.provisionRepositories(assignment.id);
      return { assignment, provision };
    },
    onSuccess: ({ provision }) => {
      reportGithubLive(provision.live);
      refreshClassViews();
      // Some repos may still have failed even on a 2xx — the backend now
      // reports them instead of aborting the whole batch on the first one.
      setPhase((provision.failures?.length ?? 0) > 0 ? "partial" : "success");
    },
    // A failure AFTER the project was created is not a failed creation. Say so,
    // or the teacher retries the form and meets a duplicate-title conflict for
    // a project they cannot see any reason to exist.
    onError: () => setPhase(createdRef.current ? "partial" : "error"),
  });

  const discardMutation = useMutation({
    mutationFn: () => assignmentsApi.remove(createdRef.current?.id as string),
    onSuccess: () => {
      createdRef.current = null;
      setCreatedAssignment(null);
      mutation.reset();
      setPhase("idle");
      refreshClassViews();
    },
  });

  const submit = (input: CreateProjectInput) => {
    const errors = validateCreateProject(input);
    setValidationErrors(errors);
    if (errors.length > 0) return; // block invalid submits; View shows errors
    mutation.mutate(input);
  };

  const result: CreateProjectResult | null = mutation.data
    ? {
        assignment: mutation.data.assignment,
        repos: mutation.data.provision.created,
        created: mutation.data.provision.created.length,
        skipped: mutation.data.provision.skipped,
        failures: mutation.data.provision.failures ?? [],
        live: mutation.data.provision.live,
        defaultBranch: mutation.data.provision.defaultBranch ?? null,
        scaffold: mutation.data.provision.scaffold ?? null,
        ownerLogin: mutation.data.provision.ownerLogin ?? null,
        ownerMode: mutation.data.provision.ownerMode ?? null,
        ownerFallback: mutation.data.provision.ownerFallback ?? false,
      }
    : null;

  const error = mutation.error ? toPresentableError(mutation.error) : null;

  return {
    submit,
    phase,
    isSubmitting: mutation.isPending,
    validationErrors,
    error,
    result,
    createdAssignment,
    // Retrying re-enters the same mutation, which now short-circuits step 1.
    // The input is irrelevant on this path and is never read.
    retryProvision: () => mutation.mutate({} as CreateProjectInput),
    discardCreated: () => {
      if (createdRef.current) discardMutation.mutate();
    },
    isDiscarding: discardMutation.isPending,
    // 401 is the backend's way of saying "connect (or reconnect) GitHub" —
    // worth a link rather than a wall of text the teacher can only re-read.
    needsGithubReconnect: error?.status === 401,
    reset: () => {
      mutation.reset();
      discardMutation.reset();
      createdRef.current = null;
      setCreatedAssignment(null);
      setPhase("idle");
      setValidationErrors([]);
    },
  };
}
