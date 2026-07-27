// ============================================================================
// BRAND CONFIG — every school-specific NAME and STRING on the front door.
//
// This platform ships as a template. A school makes it theirs by editing
// exactly two files:
//
//   1. src/app/globals.css   the PALETTE block (colours)
//   2. this file             names, tagline and front-door copy
//
// Everything here is a PLACEHOLDER. "Alpha Educ" is the demo tenant, not the
// product's real identity, and no component should hard-code it: import from
// here so a rename stays a one-line change instead of a search-and-replace
// across the view layer.
//
// Deliberately not in this file: in-app copy (it belongs with the feature it
// describes) and error messages (they belong with the ViewModel that raises
// them). This is the marketing surface only.
// ============================================================================

export const brand = {
  /** Product name, as shown in the wordmark, page title and headings. */
  name: "Alpha Educ",
  /**
   * Non-breaking-space variant for headlines. Without it a two-word name
   * wraps mid-name at narrow widths, which looks like a bug.
   */
  nameNoWrap: "Alpha Educ",
  /** The glyph in the logo tile. One character; a letter or a symbol. */
  monogram: "α",
  /** Sits under the wordmark. Three words is the shape that fits. */
  tagline: "Learn · Build · Ship",
  /**
   * What this school calls its students: "Alphanians", "Eagles", "Year 10",
   * "Coders". Rendered in the brand colour on the landing page, so it is the
   * one word on the front door that is unmistakably THIS school's. Keep it to
   * a single word or short phrase; it is greeted, not read.
   */
  cohort: "Alphanians",
  /**
   * The engine underneath. A school renames the product above but keeps this
   * credit, so it is a separate field rather than part of `name`.
   */
  poweredBy: "Alphaexplora",
} as const;

/**
 * Front-door copy. Kept next to the names because a school that renames the
 * product almost always rewrites these two lines in the same sitting.
 *
 * Constraint worth preserving on a rewrite: the headline holds to two lines at
 * desktop and the subline to about twenty words, so the circled sign-in stays
 * above the fold on a 768px-tall lab monitor.
 */
export const landingCopy = {
  /**
   * Greeting above the headline. `{cohort}` is substituted with brand.cohort
   * and rendered in the brand colour, so the placeholder stays a placeholder
   * instead of being baked into the sentence.
   */
  greeting: "Welcome, {cohort}!",
  headline: "Write it, push it, see it checked.",
  subline:
    "The classroom pipeline that runs your tests the moment you push, then shows you exactly which cases passed.",
  ctaLabel: "Sign in",
  ctaHint: "Students, teachers and IT staff. Students need no GitHub account.",
  /** The pen-written aside next to the circled sign-in. Two or three words. */
  ctaAside: "start here",
  /** One line. It is a footnote, not a paragraph. */
  helpLine: "Stuck? Ask your teacher or the IT office.",
} as const;

/**
 * The decorative panel beside every auth form. Separate from `landingCopy`
 * because it is read in a different frame of mind: the landing sells, this
 * reassures somebody who is already committed and just wants to get in.
 *
 * Deliberately free of the product name, so a rename needs no interpolation
 * and no re-reading of the sentence for grammar.
 */
export const authPanelCopy = {
  /** Line break is intentional and preserved via `whitespace-pre-line`. */
  headline: "Every push gets\na real answer.",
  body: "Your work runs the moment you push it, then the report names what passed and what did not, so feedback arrives in minutes rather than next week.",
  footnote: "Students keep a zero-footprint account · Staff link GitHub after signing in",
} as const;

/**
 * The three stages of a run, in order. These are the product's promise told as
 * a sequence rather than as a feature list, which is why the landing page
 * animates them left to right: the shape of the strip IS the explanation of
 * what CI does.
 *
 * `icon` is a key into LANDING_ICONS in components/landing/Icons.tsx, not a
 * component, so this stays a plain data file with no React import.
 */
export const pipelineStages = [
  {
    icon: "push",
    title: "You push",
    body: "Send your work from VS Code, the way professionals do.",
  },
  {
    icon: "run",
    title: "Checks run",
    body: "The pipeline builds it and runs the class test suite.",
  },
  {
    icon: "feedback",
    title: "You find out",
    body: "Results in minutes, with the failing cases named.",
  },
] as const;

export type PipelineStage = (typeof pipelineStages)[number];

/**
 * What a run actually does to a student's work, named in the terms the product
 * itself uses. This is the vocabulary lesson hiding inside the front door: a
 * class meets "build", "test suite" and "lint" here before they meet them in a
 * failing run, which is the point at which the words are hardest to learn.
 *
 * Order matters. It is the order the checks execute in.
 */
export const pipelineChecks = [
  { icon: "build", label: "Builds your project" },
  { icon: "test", label: "Runs the test suite" },
  { icon: "lint", label: "Checks code style" },
  { icon: "deadline", label: "Records the time you pushed" },
] as const;

export type PipelineCheck = (typeof pipelineChecks)[number];
