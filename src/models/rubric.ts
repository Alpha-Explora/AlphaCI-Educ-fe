// ============================================================================
// MODEL LAYER — Grading rubric.
//
// The documentation a teacher reads is NOT written here. It is read out of
// rubric.schema.json, which is the same file the pipeline validates every
// rubric against in cicd-workflow. Prose and behaviour therefore cannot drift:
// changing what a threshold does means editing the schema, and the teacher's
// explanation of it changes in the same commit.
//
// rubric.schema.json is vendored from cicd-workflow/rubrics/rubric.schema.json.
// It is the contract between the three repositories; when it changes there,
// copy it here in the same pull request.
// ============================================================================
import schema from "./rubric.schema.json";

export type CoverageScoring = "linear" | "binary";
export type HiddenTestMode = "ci" | "secure";
export type MaintainabilityRating = "A" | "B" | "C" | "D" | "E";

export interface Rubric {
  version: 1;
  source?: "backend" | "fallback";
  coverage: {
    lines: number;
    branches?: number;
    functions?: number;
    statements?: number;
    enforce: boolean;
    scoring: CoverageScoring;
  };
  points: {
    lint: number;
    quality: number;
    publicTests: number;
    hiddenTests: number;
    bonus?: number;
  };
  gates: {
    lintBlocks: boolean;
    coverageBlocks: boolean;
    qualityGateBlocks: boolean;
    /** Always false — see the schema description. Not teacher-configurable. */
    integrityBlocks: false;
  };
  quality?: {
    maxCognitiveComplexity: number;
    maxDuplicationPercent: number;
    /** Debt ratio at or below which maintainability scores in full. */
    fullCreditDebtRatio?: number;
    /** Debt ratio at or above which it scores nothing. Linear between. */
    zeroCreditDebtRatio?: number;
    /** The target shown to students; the debt ratio above carries the score. */
    minMaintainabilityRating: MaintainabilityRating;
    deductPerBug: number;
    deductPerVulnerability: number;
    /** Charged on the excess above maxDuplicationPercent only. 0 = advisory. */
    deductPerDuplicationPercent?: number;
  };
  hiddenTests?: {
    mode: HiddenTestMode;
    revealAfterDue: boolean;
    showFailureHints: boolean;
  };
  integrity?: {
    similarityWarn: number;
    similarityFlag: number;
    /** Always true — see the schema description. Not teacher-configurable. */
    excludeBasecode: true;
  };
}

// ─── Reading documentation out of the schema ────────────────────────────────

interface SchemaNode {
  title?: string;
  description?: string;
  type?: string;
  enum?: string[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  properties?: Record<string, SchemaNode>;
}

export interface RubricFieldDoc {
  key: string;
  /** Dotted path into a Rubric, e.g. "coverage.lines". */
  path: string;
  title: string;
  description: string;
  /** Present when the schema pins the value — the field is not configurable. */
  fixedValue?: string;
  choices?: string[];
  range?: { min?: number; max?: number };
}

export interface RubricSectionDoc {
  key: string;
  title: string;
  description: string;
  fields: RubricFieldDoc[];
}

const root = schema as unknown as SchemaNode;

/**
 * Flatten the schema into sections a teacher can read.
 *
 * Sections are derived rather than hardcoded so that a group added to the
 * schema appears in the UI without anyone remembering to update this file —
 * the failure mode we are avoiding is a rubric option that silently affects
 * grades while being documented nowhere.
 */
export function rubricSections(): RubricSectionDoc[] {
  const groups = root.properties ?? {};

  return Object.entries(groups)
    .filter(([, node]) => node.type === "object" && node.properties)
    .map(([sectionKey, node]) => ({
      key: sectionKey,
      title: node.title ?? sectionKey,
      description: node.description ?? "",
      fields: Object.entries(node.properties ?? {}).map(([fieldKey, field]) => ({
        key: fieldKey,
        path: `${sectionKey}.${fieldKey}`,
        title: field.title ?? fieldKey,
        description: field.description ?? "",
        fixedValue:
          field.const === undefined ? undefined : String(field.const),
        choices: field.enum,
        range:
          field.minimum === undefined && field.maximum === undefined
            ? undefined
            : { min: field.minimum, max: field.maximum },
      })),
    }));
}

/** Read a dotted path off a rubric, for showing the value beside its docs. */
export function rubricValueAt(rubric: Rubric | null, path: string): string | null {
  if (!rubric) return null;
  const value = path
    .split(".")
    .reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), rubric);

  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "On" : "Off";
  return String(value);
}

// ─── Stage reference ────────────────────────────────────────────────────────

/**
 * The seven pipeline stages in run order.
 *
 * Deliberately phrased as the questions a student sees in their Actions log,
 * so a teacher explaining a result is using the same words the student read.
 *
 * ONE list, TWO audiences. `measures` and `note` address the teacher ("your
 * tests, which the student cannot read"); `forStudent` addresses the student
 * directly and says what to do about a failure. They live together so a stage
 * cannot be changed for one audience and left stale for the other — the same
 * reason the rubric documentation is generated from rubric.schema.json rather
 * than written twice.
 */
export const PIPELINE_STAGES = [
  {
    number: 1,
    id: "SANDBOX",
    question: "Does your code start?",
    measures: "Dependencies install and the code parses.",
    points: null,
    blocks: true,
    note: "Always stops the run when it fails — code that does not parse cannot be tested.",
    forStudent: {
      meaning:
        "Your project is downloaded onto a fresh computer in the cloud, and it tries to install your dependencies and read your code. Nothing has been tested yet — this only checks that your project can start at all.",
      whatToDo:
        "If this fails, everything after it is skipped. Look for a typo that breaks the file, a package missing from package.json, or a file you forgot to commit. Fixing this first unblocks every other stage.",
    },
  },
  {
    number: 2,
    id: "LINT",
    question: "Is your code styled correctly?",
    measures: "Naming, indentation, unused imports, line length.",
    points: "lint",
    blocks: false,
    note: "Usually set not to block, so a formatting slip does not cost a student their test results.",
    forStudent: {
      meaning:
        "A style checker reads your code the way a picky reviewer would: inconsistent indentation, unused imports, variables named badly, lines that run too long.",
      whatToDo:
        "Most style problems can be fixed automatically. Try `npm run lint -- --fix` before you push. This stage normally does not stop the run, so you still get your test results.",
    },
  },
  {
    number: 3,
    id: "CODE_QUALITY",
    question: "Is your code maintainable?",
    measures: "Maintainability, duplication and complexity from SonarCloud.",
    points: "quality",
    blocks: false,
    note: "Measures how well the code is built, not whether it works.",
    forStudent: {
      meaning:
        "SonarCloud reads your code and estimates how long it would take to clean up everything questionable it found. It also measures how much of your code is copy-pasted from elsewhere in your own project. This is about how well the code is BUILT, not whether it works.",
      whatToDo:
        "Working code can still score badly here, and that is the point. The fastest wins are usually removing copy-pasted blocks by turning them into one function, and splitting any function that has grown too long to follow.",
    },
  },
  {
    number: 4,
    id: "PUBLIC_TESTS",
    question: "Do the tests you can see pass?",
    measures: "The visible suite, scaled by coverage.",
    points: "publicTests",
    blocks: true,
    note: "Coverage below target scales these points rather than zeroing them.",
    forStudent: {
      meaning:
        "The tests in your own repository run, and the pipeline also measures coverage — how much of your code those tests actually execute.",
      whatToDo:
        "Run them locally first with `npm test`; a test that fails on your machine will fail here too. If coverage is low, the marks scale down rather than dropping to zero, so writing a few more tests always helps.",
    },
  },
  {
    number: 5,
    id: "HIDDEN_TESTS",
    question: "Do the tests you can't see pass?",
    measures: "Your tests, which the student cannot read.",
    points: "hiddenTests",
    blocks: false,
    note: "Runs in the student's pipeline (ci) or on AlphaCI's own infrastructure (secure).",
    forStudent: {
      meaning:
        "Your teacher's own tests run against your code. You cannot read them, but you can see what your code did wrong when one fails — the input it was given and what it was expected to produce.",
      whatToDo:
        "These exist so that code which only satisfies the visible tests does not score full marks. Read the failure message, work out which case you have not handled, and fix the logic. Do not try to guess the tests.",
    },
  },
  {
    number: 6,
    id: "INTEGRITY",
    question: "Originality check",
    measures: "Cross-class similarity and commit-history signals.",
    points: null,
    blocks: false,
    note: "Worth no points and never blocks. Raises a flag for you to review.",
    forStudent: {
      meaning:
        "Your submission is compared against your classmates' for unusual similarity, and your commit history is checked for patterns like an entire project appearing in one commit.",
      whatToDo:
        "This is worth no marks and never stops your run. Committing your work in small steps as you go is the honest habit here — and it also makes this check look exactly the way it should.",
    },
  },
  {
    number: 7,
    id: "SCORING",
    question: "Your result",
    measures: "Aggregates every stage into one scorecard.",
    points: null,
    blocks: false,
    note: "Always runs, so a student gets a score even from a run that stopped early.",
    forStudent: {
      meaning:
        "Every stage is collected into one scorecard showing what passed and what to fix. This always runs, even if your pipeline stopped at stage 1, so you never get a blank result.",
      whatToDo:
        "Your MARK is not shown here. Your teacher releases marks for the whole class once they have reviewed the runs — so use this page for the feedback, not for a score.",
    },
  },
] as const;
