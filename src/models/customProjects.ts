// ============================================================================
// MODEL LAYER — Custom projects: the three file groups, and the wire reference.
//
// A teacher authoring a project writes three kinds of file, and exactly one of
// them reaches the student. That single fact is the entire safety model, so it
// is declared HERE, as data, rather than being spelled out in whichever
// component happens to render it. A group's colour, its glyph, and the sentence
// naming the consequence all travel together — which is what stops the editor
// and the picker from describing the same group two different ways.
//
// WHAT BELONGS IN `consequence`
// -----------------------------
// Only what a teacher would otherwise find out from the wrong person. "These
// are the starter files" is a label, not a consequence; "everything here is
// committed to a public repository" is the reason the group exists and the one
// sentence that prevents the mistake this shape is designed around.
//
// The mistake being designed around is specific: a teacher pastes their
// reference answer into the starter group and it is published to a repository
// anyone can read, including the rest of the class. Nothing in a file's own
// contents distinguishes an answer from a stub, so the interface has to.
// ============================================================================
import type {
  CustomProjectStackFiles,
  ProjectTemplateOption,
  Stack,
} from "./types";

/** Keys of CustomProjectStackFiles, in the order a teacher fills them in. */
export type FileGroupId = keyof CustomProjectStackFiles;

export interface FileGroupDescriptor {
  id: FileGroupId;
  label: string;
  /**
   * Does this group reach the student's repository?
   *
   * The PRIMARY read of the whole editor is this boolean, not which of the
   * three groups a file is in. Two of the groups are secret and one is not, and
   * a teacher scanning the form needs that answer before any other.
   */
  shipped: boolean;
  /** Short badge text — the answer to "who sees this", in three words. */
  audience: string;
  /** Why the group exists, phrased as what happens to a file placed in it. */
  consequence: string;
  /** Shown in place of the file list before the teacher has written anything. */
  emptyHint: string;
  /** Suffix the group's example paths, so "Add file" can seed a plausible one. */
  examplePath: string;
}

/**
 * Order matters and is not alphabetical: starter first because it is the one
 * that ships, and putting the public group at the top is what makes the two
 * below it read as exceptions to it rather than as peers.
 */
export const FILE_GROUPS: readonly FileGroupDescriptor[] = [
  {
    id: "starter",
    label: "Starter files",
    shipped: true,
    audience: "Students see these",
    consequence:
      "Committed to the student's repository, which is public. Write the scaffolding they build on — stubs, fixtures, a README — and nothing you would not publish.",
    emptyHint:
      "No starter files yet. Without at least one, a student's repository would be created empty.",
    examplePath: "src/index.ts",
  },
  {
    id: "solution",
    label: "Reference solution",
    shipped: false,
    audience: "Never leaves AlphaCI",
    consequence:
      "Your own working answer. Held for you to compare against while marking, and served only to staff — it is never committed to any student repository.",
    emptyHint:
      "Optional. Add your working answer if you want it beside the marks later.",
    examplePath: "src/index.ts",
  },
  {
    id: "hiddenTests",
    label: "Hidden tests",
    shipped: false,
    audience: "Never leaves AlphaCI",
    consequence:
      "Run against the student's code at grading time and worth a share of the mark. They never appear in the repository, so a student cannot write code that satisfies the test instead of the problem.",
    emptyHint:
      "Optional. Projects without hidden tests are still marked — on the other stages.",
    examplePath: "tests/hidden/hidden.test.ts",
  },
] as const;

export function fileGroup(id: FileGroupId): FileGroupDescriptor {
  // Non-null: FileGroupId is the key union of the same object this list mirrors,
  // so a miss is a compile error rather than a runtime one.
  return FILE_GROUPS.find((g) => g.id === id) as FileGroupDescriptor;
}

/** An empty set of the three groups — the shape a newly enabled language starts at. */
export function emptyStackFiles(): CustomProjectStackFiles {
  return { starter: [], solution: [], hiddenTests: [] };
}

// ---------------------------------------------------------------------------
// The wire reference
// ---------------------------------------------------------------------------

/**
 * How a custom project is named in an assignment's `template` field.
 *
 * An assignment points at ONE catalogue, and that catalogue now has two origins.
 * `calculator` is a built-in; `custom:cpt_abc` is a teacher's own. The prefix is
 * what keeps a future built-in from ever colliding with an id the database
 * generated, and it is what tells the server which store to resolve from without
 * a second field on the assignment saying so.
 */
export const CUSTOM_TEMPLATE_PREFIX = "custom:";

/**
 * The value to send as an assignment's `template`, for any catalogue entry.
 *
 * Tolerant of the id ALREADY carrying the prefix. The catalogue endpoint is free
 * to return either `cpt_abc` or `custom:cpt_abc` as the option's id — both name
 * the same project and neither is wrong — and a picker that assumed one of them
 * would send `custom:custom:cpt_abc` against the other. Since the only cost of
 * checking is one `startsWith`, the frontend absorbs the ambiguity rather than
 * making the contract carry it.
 */
export function templateRefFor(option: ProjectTemplateOption): string {
  if (!option.custom) return option.id;
  return option.id.startsWith(CUSTOM_TEMPLATE_PREFIX)
    ? option.id
    : `${CUSTOM_TEMPLATE_PREFIX}${option.id}`;
}

/**
 * The `cpt_…` id inside a catalogue entry, for the routes that edit it.
 *
 * The inverse of the tolerance above: the editor and the delete action address
 * /custom-projects/:id, which wants the bare id whichever form the catalogue
 * used.
 */
export function customProjectIdOf(option: ProjectTemplateOption): string {
  return option.id.startsWith(CUSTOM_TEMPLATE_PREFIX)
    ? option.id.slice(CUSTOM_TEMPLATE_PREFIX.length)
    : option.id;
}

// ---------------------------------------------------------------------------
// Derivations the picker needs
// ---------------------------------------------------------------------------

/**
 * Which languages a custom project can build — the stacks it has starter files
 * for.
 *
 * Deliberately NOT "every key present in `stacks`". A language the teacher
 * enabled and then only wrote hidden tests for would scaffold an empty
 * repository, so it is not offerable; the same rule the editor validates
 * against is the one that decides what the picker shows.
 */
export function supportedStacksOf(
  stacks: Partial<Record<Stack, CustomProjectStackFiles>>,
): Stack[] {
  return (Object.keys(stacks) as Stack[]).filter(
    (stack) => (stacks[stack]?.starter.length ?? 0) > 0,
  );
}
