"use client";
// ============================================================================
// VIEWMODEL LAYER — Custom projects (teacher-authored reusable starters).
//
// Two ViewModels, because the two surfaces need opposite things:
//
//   useCustomProjectEditor(id)  — loads ONE project with full contents, and
//                                 owns create / update / delete. Called only
//                                 while the editor dialog is open, so solution
//                                 and hidden-test source is fetched at the
//                                 moment a teacher asks to edit it and at no
//                                 other time.
//   useCustomProjectDraft()     — is not a ViewModel at all. See below: the
//                                 draft reducer is exported as pure functions
//                                 so the View can hold form state the way every
//                                 other form in this wizard does.
//
// Validation lives here rather than in the View for the same reason
// validateCreateProject does: the rules are what the server will enforce, and a
// View is the wrong place to keep a second opinion about them.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customProjectsApi } from "@/models/api";
import {
  FILE_GROUPS,
  emptyStackFiles,
  supportedStacksOf,
  type FileGroupId,
} from "@/models/customProjects";
import type {
  CustomProject,
  CustomProjectFile,
  CustomProjectInput,
  CustomProjectStackFiles,
  Stack,
} from "@/models/types";
import { queryKeys } from "./queryKeys";
import { STACK_OPTIONS } from "./useCreateProject";
import { toPresentableError, type PresentableError } from "./errors";

/**
 * "Node.js", not "nodejs".
 *
 * A validation message names a control the teacher has to find, and the chip
 * they would look for says "Node.js". Printing the wire key instead makes them
 * translate — which is exactly the moment a message stops being read.
 */
function stackLabel(stack: Stack): string {
  return STACK_OPTIONS.find((o) => o.value === stack)?.label ?? stack;
}

// ---------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------

/**
 * A project being authored.
 *
 * Structurally CustomProjectInput, and deliberately so — there is no separate
 * "form shape" to translate back and forth, which is the usual source of a field
 * that saves as undefined because nobody mapped it. The one difference is that
 * every optional field is present and empty here: a form has to be able to hold
 * "the teacher deleted the last note" as a state, and `notes: undefined` cannot
 * be typed into.
 */
export type CustomProjectDraft = CustomProjectInput;

export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * What "difficulty" means, so the pips are a judgement rather than a guess.
 *
 * The built-in catalogue is already sorted by this number and a teacher picking
 * between their own project and a built-in is comparing the two meters directly,
 * so an unanchored 1-5 would make the comparison meaningless in one direction
 * only — theirs.
 */
export const DIFFICULTY_HINTS: Record<number, string> = {
  1: "First weeks — one file, one idea.",
  2: "Straightforward — a few functions, no state to keep.",
  3: "Typical coursework — several parts that have to fit together.",
  4: "Demanding — design decisions, edge cases that bite.",
  5: "Capstone — open-ended, the student decides the shape.",
};

export function emptyDraft(): CustomProjectDraft {
  return {
    name: "",
    summary: "",
    teaches: "",
    difficulty: 2,
    brief: { overview: "", tasks: [{ name: "", detail: "" }], notes: [] },
    stacks: {},
  };
}

/**
 * Load a saved project into the form.
 *
 * `notes` is normalised from absent to empty, and `tasks` from empty to one
 * blank row: both are the difference between a form you can type into and one
 * with nothing on screen to type into.
 */
export function draftFrom(project: CustomProject): CustomProjectDraft {
  return {
    name: project.name,
    summary: project.summary,
    teaches: project.teaches,
    difficulty: project.difficulty,
    brief: {
      overview: project.brief.overview,
      tasks:
        project.brief.tasks.length > 0
          ? project.brief.tasks.map((t) => ({ ...t }))
          : [{ name: "", detail: "" }],
      notes: [...(project.brief.notes ?? [])],
    },
    stacks: Object.fromEntries(
      (Object.keys(project.stacks) as Stack[]).map((stack) => [
        stack,
        {
          starter: [...(project.stacks[stack]?.starter ?? [])],
          solution: [...(project.stacks[stack]?.solution ?? [])],
          hiddenTests: [...(project.stacks[stack]?.hiddenTests ?? [])],
        },
      ]),
    ),
  };
}

/**
 * The payload, cleaned of the empties a form necessarily accumulates.
 *
 * Blank task rows and blank notes are UI artefacts — a teacher pressed "Add" and
 * then changed their mind — and sending them would put an unnamed step in a
 * student's brief. `notes` goes back to absent when empty so the saved document
 * matches what an un-annotated project looked like before the field existed.
 */
export function toInput(draft: CustomProjectDraft): CustomProjectInput {
  const notes = (draft.brief.notes ?? [])
    .map((n) => n.trim())
    .filter(Boolean);

  return {
    name: draft.name.trim(),
    summary: draft.summary.trim(),
    teaches: draft.teaches.trim(),
    difficulty: draft.difficulty,
    brief: {
      overview: draft.brief.overview.trim(),
      tasks: draft.brief.tasks
        .filter((t) => t.name.trim() !== "" || t.detail.trim() !== "")
        .map((t) => ({ name: t.name.trim(), detail: t.detail.trim() })),
      ...(notes.length > 0 && { notes }),
    },
    // Files are NOT trimmed. A path is trimmed because stray whitespace in one
    // is always a typo; content is not, because leading whitespace in a source
    // file is the indentation.
    stacks: Object.fromEntries(
      (Object.keys(draft.stacks) as Stack[]).map((stack) => [
        stack,
        mapGroups(draft.stacks[stack] as CustomProjectStackFiles, (files) =>
          files
            .map((f) => ({ path: f.path.trim(), content: f.content }))
            .filter((f) => f.path !== ""),
        ),
      ]),
    ),
  };
}

function mapGroups(
  files: CustomProjectStackFiles,
  fn: (files: CustomProjectFile[]) => CustomProjectFile[],
): CustomProjectStackFiles {
  return {
    starter: fn(files.starter),
    solution: fn(files.solution),
    hiddenTests: fn(files.hiddenTests),
  };
}

// ---- Draft edits, as pure functions ---------------------------------------
// The View calls setDraft(withFileChanged(draft, …)). Pure rather than a hook
// because the editor is a dialog that can be discarded: form state belongs to
// the component that can be unmounted with it, and these are only the rules for
// producing the next one.

export function withStackEnabled(
  draft: CustomProjectDraft,
  stack: Stack,
  enabled: boolean,
): CustomProjectDraft {
  const stacks = { ...draft.stacks };
  if (enabled) stacks[stack] = stacks[stack] ?? emptyStackFiles();
  // Removing the key rather than emptying it: an enabled language with no files
  // and a disabled one are the same project, and keeping the key would offer
  // the project for a language it cannot build.
  else delete stacks[stack];
  return { ...draft, stacks };
}

function groupOf(
  draft: CustomProjectDraft,
  stack: Stack,
  group: FileGroupId,
): CustomProjectFile[] {
  return draft.stacks[stack]?.[group] ?? [];
}

function withGroup(
  draft: CustomProjectDraft,
  stack: Stack,
  group: FileGroupId,
  files: CustomProjectFile[],
): CustomProjectDraft {
  const current = draft.stacks[stack] ?? emptyStackFiles();
  return {
    ...draft,
    stacks: { ...draft.stacks, [stack]: { ...current, [group]: files } },
  };
}

export function withFileAdded(
  draft: CustomProjectDraft,
  stack: Stack,
  group: FileGroupId,
  path = "",
): CustomProjectDraft {
  return withGroup(draft, stack, group, [
    ...groupOf(draft, stack, group),
    { path, content: "" },
  ]);
}

export function withFileChanged(
  draft: CustomProjectDraft,
  stack: Stack,
  group: FileGroupId,
  index: number,
  patch: Partial<CustomProjectFile>,
): CustomProjectDraft {
  return withGroup(
    draft,
    stack,
    group,
    groupOf(draft, stack, group).map((file, i) =>
      i === index ? { ...file, ...patch } : file,
    ),
  );
}

export function withFileRemoved(
  draft: CustomProjectDraft,
  stack: Stack,
  group: FileGroupId,
  index: number,
): CustomProjectDraft {
  return withGroup(
    draft,
    stack,
    group,
    groupOf(draft, stack, group).filter((_, i) => i !== index),
  );
}

/**
 * Move a file between groups, keeping its path and contents.
 *
 * This is the recovery action for the mistake the whole layout is designed
 * around. A teacher who realises their answer key is in the starter group needs
 * one press to fix it — retyping the file into the right group is exactly the
 * moment they would give up and leave it where it is.
 */
export function withFileMoved(
  draft: CustomProjectDraft,
  stack: Stack,
  from: FileGroupId,
  index: number,
  to: FileGroupId,
): CustomProjectDraft {
  const file = groupOf(draft, stack, from)[index];
  if (!file || from === to) return draft;
  const removed = withFileRemoved(draft, stack, from, index);
  return withGroup(removed, stack, to, [...groupOf(removed, stack, to), file]);
}

export function withTaskAdded(draft: CustomProjectDraft): CustomProjectDraft {
  return {
    ...draft,
    brief: { ...draft.brief, tasks: [...draft.brief.tasks, { name: "", detail: "" }] },
  };
}

export function withTaskChanged(
  draft: CustomProjectDraft,
  index: number,
  patch: Partial<{ name: string; detail: string }>,
): CustomProjectDraft {
  return {
    ...draft,
    brief: {
      ...draft.brief,
      tasks: draft.brief.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    },
  };
}

export function withTaskRemoved(
  draft: CustomProjectDraft,
  index: number,
): CustomProjectDraft {
  return {
    ...draft,
    brief: { ...draft.brief, tasks: draft.brief.tasks.filter((_, i) => i !== index) },
  };
}

/**
 * Reorder a task. Tasks are numbered in the student's brief, so their order IS
 * the teaching sequence — a list you can only append to would force a teacher to
 * retype three steps to insert one.
 */
export function withTaskMoved(
  draft: CustomProjectDraft,
  index: number,
  delta: -1 | 1,
): CustomProjectDraft {
  const next = index + delta;
  const tasks = draft.brief.tasks;
  if (next < 0 || next >= tasks.length) return draft;
  const reordered = [...tasks];
  [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
  return { ...draft, brief: { ...draft.brief, tasks: reordered } };
}

export function withNoteAdded(draft: CustomProjectDraft): CustomProjectDraft {
  return { ...draft, brief: { ...draft.brief, notes: [...(draft.brief.notes ?? []), ""] } };
}

export function withNoteChanged(
  draft: CustomProjectDraft,
  index: number,
  value: string,
): CustomProjectDraft {
  return {
    ...draft,
    brief: {
      ...draft.brief,
      notes: (draft.brief.notes ?? []).map((n, i) => (i === index ? value : n)),
    },
  };
}

export function withNoteRemoved(
  draft: CustomProjectDraft,
  index: number,
): CustomProjectDraft {
  return {
    ...draft,
    brief: {
      ...draft.brief,
      notes: (draft.brief.notes ?? []).filter((_, i) => i !== index),
    },
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** The two steps of the editor, so an error can name where it has to be fixed. */
export type EditorStepId = "brief" | "files";

export interface DraftProblem {
  step: EditorStepId;
  message: string;
}

/**
 * Blocking problems, in the order the form presents them.
 *
 * Every rule here answers "would the saved project work?", not "is this tidy".
 * A project with no summary is unpickable (the card would be blank); a language
 * with no starter files scaffolds an empty repository. Style is not policed —
 * a teacher's brief is theirs.
 */
export function validateDraft(draft: CustomProjectDraft): DraftProblem[] {
  const problems: DraftProblem[] = [];
  const input = toInput(draft);

  if (!input.name) problems.push({ step: "brief", message: "Name your project." });
  if (!input.summary)
    problems.push({
      step: "brief",
      message: "Add a one-line summary — it is what you will see in the picker.",
    });
  if (!input.teaches)
    problems.push({ step: "brief", message: "Say what the project teaches." });
  if (!input.brief.overview)
    problems.push({ step: "brief", message: "Write the overview students read." });
  if (input.brief.tasks.length === 0)
    problems.push({ step: "brief", message: "Add at least one task." });
  // A task with detail but no name renders as an unnumbered paragraph in the
  // brief, which reads as a mistake to the student rather than to the teacher.
  if (input.brief.tasks.some((t) => !t.name))
    problems.push({ step: "brief", message: "Every task needs a name." });

  const stacks = Object.keys(input.stacks) as Stack[];
  if (stacks.length === 0)
    problems.push({ step: "files", message: "Choose at least one language." });

  for (const stack of stacks) {
    const files = input.stacks[stack] as CustomProjectStackFiles;
    if (files.starter.length === 0)
      problems.push({
        step: "files",
        message: `${stackLabel(stack)}: add at least one starter file, or turn the language off.`,
      });

    for (const group of FILE_GROUPS) {
      const paths = files[group.id].map((f) => f.path);
      const duplicate = paths.find((p, i) => paths.indexOf(p) !== i);
      if (duplicate)
        problems.push({
          step: "files",
          message: `${stackLabel(stack)} · ${group.label}: two files are both called “${duplicate}”.`,
        });
    }
  }

  // De-duplicated: two languages missing starter files produce two distinct
  // messages, but one language failing two rules can produce the same sentence
  // twice, and a list that repeats itself reads as a bug in the form.
  const seen = new Map<string, DraftProblem>();
  for (const problem of problems) seen.set(`${problem.step}|${problem.message}`, problem);
  return [...seen.values()];
}

/**
 * Paths in the STARTER group that look like they belong somewhere else.
 *
 * A warning, never a block. The interface cannot know that `solver.py` is the
 * answer and `solution_template.py` is the stub, so this only says out loud what
 * the name suggests and leaves the judgement where it belongs. It exists because
 * the failure it guards against is silent and public: a starter file is
 * committed to a repository the whole class can read, and nothing afterwards
 * tells the teacher it happened.
 */
const LEAK_HINTS = ["solution", "answer", "hidden", "solved", "key"];

export function suspiciousStarterPaths(files: CustomProjectFile[]): string[] {
  return files
    .map((f) => f.path.trim())
    .filter((path) => {
      const lower = path.toLowerCase();
      return path !== "" && LEAK_HINTS.some((hint) => lower.includes(hint));
    });
}

/** Files across all three groups, for the "N files" count on a language tab. */
export function fileCountFor(files: CustomProjectStackFiles | undefined): number {
  if (!files) return 0;
  return files.starter.length + files.solution.length + files.hiddenTests.length;
}

/** Languages this draft would actually be offerable for — mirrors the picker. */
export function offerableStacks(draft: CustomProjectDraft): Stack[] {
  return supportedStacksOf(toInput(draft).stacks);
}

// ---------------------------------------------------------------------------
// ViewModel
// ---------------------------------------------------------------------------

export interface CustomProjectEditorVM {
  /** The saved project, when editing. Null while creating or still loading. */
  project: CustomProject | null;
  isLoading: boolean;
  loadError: PresentableError | null;

  save: (input: CustomProjectInput) => void;
  isSaving: boolean;
  saveError: PresentableError | null;

  remove: () => void;
  isRemoving: boolean;
  removeError: PresentableError | null;
}

/**
 * One project's lifecycle. `id` null means "creating".
 *
 * `onSaved` and `onRemoved` are callbacks rather than returned state because the
 * useful thing after a save is a NAVIGATION — close the editor, select the new
 * project — and a component watching a phase flag to perform one is how a dialog
 * ends up closing twice.
 */
export function useCustomProjectEditor(
  id: string | null,
  callbacks: {
    onSaved?: (project: CustomProject) => void;
    onRemoved?: () => void;
  } = {},
): CustomProjectEditorVM {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.customProjects.detail(id ?? ""),
    queryFn: () => customProjectsApi.get(id as string),
    enabled: Boolean(id),
    // Contents are only ever changed from this editor, so a cached copy cannot
    // go stale behind the teacher's back within one sitting.
    staleTime: 60_000,
    retry: false,
  });

  /**
   * Everything a write has to refresh.
   *
   * The catalogue is the non-obvious one: /assignments/templates lists custom
   * projects too, so saving a project that the wizard is NOT currently showing
   * still changes what its picker offers. Without this the teacher saves, closes
   * the editor, and their project is missing until a reload.
   */
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.assignments.templates });
    void queryClient.invalidateQueries({ queryKey: queryKeys.customProjects.all });
    if (id)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customProjects.detail(id),
      });
  };

  const saveMutation = useMutation({
    mutationFn: (input: CustomProjectInput) =>
      id ? customProjectsApi.update(id, input) : customProjectsApi.create(input),
    onSuccess: (saved) => {
      invalidate();
      callbacks.onSaved?.(saved);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => customProjectsApi.remove(id as string),
    onSuccess: () => {
      invalidate();
      callbacks.onRemoved?.();
    },
  });

  return {
    project: query.data ?? null,
    isLoading: query.isLoading && Boolean(id),
    loadError: query.error ? toPresentableError(query.error) : null,

    save: (input) => saveMutation.mutate(input),
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error ? toPresentableError(saveMutation.error) : null,

    remove: () => {
      if (id) removeMutation.mutate();
    },
    isRemoving: removeMutation.isPending,
    removeError: removeMutation.error ? toPresentableError(removeMutation.error) : null,
  };
}
