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
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi, classesApi } from "@/models/api";
import type {
  Assignment,
  AssignmentRepository,
  CreateProjectInput,
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

// ADDENDUM G — stack option metadata for the language selects.
export const STACK_OPTIONS: ReadonlyArray<{ value: Stack; label: string }> = [
  { value: "nodejs", label: "Node.js" },
  { value: "nestjs", label: "NestJS" },
  { value: "nextjs", label: "Next.js" },
  { value: "react", label: "React" },
];
export const BACKEND_STACK_OPTIONS = STACK_OPTIONS.filter((o) =>
  ["nodejs", "nestjs"].includes(o.value),
);
export const FRONTEND_STACK_OPTIONS = STACK_OPTIONS.filter((o) =>
  ["nextjs", "react"].includes(o.value),
);

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
  if (!input.dueDate) errors.push("Due date is required.");
  if (!Number.isFinite(input.points) || input.points <= 0)
    errors.push("Points must be a positive number.");

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

/** Slugify a title the same shape the backend uses for repo names. */
function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export function repoNamePreview(
  input: Pick<CreateProjectInput, "title" | "repoStructure" | "type">,
  sampleStudentSlug = "student",
): RepoNamePreview[] {
  const slug = slugifyTitle(input.title);
  const holder = input.type === "GROUP" ? "group1" : sampleStudentSlug;
  const base = `${slug}-${holder}`;
  if (input.repoStructure === "SPLIT") {
    return [
      { component: "BACKEND", name: `${base}-be` },
      { component: "FRONTEND", name: `${base}-fe` },
    ];
  }
  return [{ component: "SINGLE", name: base }];
}

// ---- ViewModel --------------------------------------------------------------

export type CreateProjectPhase =
  | "idle"
  | "creating"
  | "provisioning"
  | "success"
  | "error";

export interface CreateProjectResult {
  assignment: Assignment;
  repos: AssignmentRepository[];
  created: number;
  skipped: number;
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
}

export function useCreateProject(classId: string | null): CreateProjectVM {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<CreateProjectPhase>("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      // Step 1 — create the assignment + repo records.
      setPhase("creating");
      const created = await classesApi.createAssignment(classId as string, input);
      // Step 2 — provision the real GitHub repos + scaffold.
      setPhase("provisioning");
      const provision = await assignmentsApi.provisionRepositories(
        created.assignment.id,
      );
      return { created, provision };
    },
    onSuccess: ({ provision }) => {
      reportGithubLive(provision.live);
      // Refresh assignments list, roster, and teacher dashboards.
      queryClient.invalidateQueries({
        queryKey: queryKeys.classes.assignments(classId ?? "none"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.classes.roster(classId ?? "none"),
      });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards", "teacher"] });
      setPhase("success");
    },
    onError: () => setPhase("error"),
  });

  const submit = (input: CreateProjectInput) => {
    const errors = validateCreateProject(input);
    setValidationErrors(errors);
    if (errors.length > 0) return; // block invalid submits; View shows errors
    mutation.mutate(input);
  };

  const result: CreateProjectResult | null = mutation.data
    ? {
        assignment: mutation.data.created.assignment,
        repos: mutation.data.provision.created,
        created: mutation.data.provision.created.length,
        skipped: mutation.data.provision.skipped,
        live: mutation.data.provision.live,
        defaultBranch: mutation.data.provision.defaultBranch ?? null,
        scaffold: mutation.data.provision.scaffold ?? null,
        ownerLogin: mutation.data.provision.ownerLogin ?? null,
        ownerMode: mutation.data.provision.ownerMode ?? null,
        ownerFallback: mutation.data.provision.ownerFallback ?? false,
      }
    : null;

  return {
    submit,
    phase,
    isSubmitting: mutation.isPending,
    validationErrors,
    error: mutation.error ? toPresentableError(mutation.error) : null,
    result,
    reset: () => {
      mutation.reset();
      setPhase("idle");
      setValidationErrors([]);
    },
  };
}
