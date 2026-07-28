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
    minMaintainabilityRating: MaintainabilityRating;
    deductPerBug: number;
    deductPerVulnerability: number;
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
  },
  {
    number: 2,
    id: "LINT",
    question: "Is your code styled correctly?",
    measures: "Naming, indentation, unused imports, line length.",
    points: "lint",
    blocks: false,
    note: "Usually set not to block, so a formatting slip does not cost a student their test results.",
  },
  {
    number: 3,
    id: "CODE_QUALITY",
    question: "Is your code maintainable?",
    measures: "Maintainability, duplication and complexity from SonarCloud.",
    points: "quality",
    blocks: false,
    note: "Measures how well the code is built, not whether it works.",
  },
  {
    number: 4,
    id: "PUBLIC_TESTS",
    question: "Do the tests you can see pass?",
    measures: "The visible suite, scaled by coverage.",
    points: "publicTests",
    blocks: true,
    note: "Coverage below target scales these points rather than zeroing them.",
  },
  {
    number: 5,
    id: "HIDDEN_TESTS",
    question: "Do the tests you can't see pass?",
    measures: "Your tests, which the student cannot read.",
    points: "hiddenTests",
    blocks: false,
    note: "Runs in the student's pipeline (ci) or on AlphaCI's own infrastructure (secure).",
  },
  {
    number: 6,
    id: "INTEGRITY",
    question: "Originality check",
    measures: "Cross-class similarity and commit-history signals.",
    points: null,
    blocks: false,
    note: "Worth no points and never blocks. Raises a flag for you to review.",
  },
  {
    number: 7,
    id: "SCORING",
    question: "Your result",
    measures: "Aggregates every stage into one scorecard.",
    points: null,
    blocks: false,
    note: "Always runs, so a student gets a score even from a run that stopped early.",
  },
] as const;
