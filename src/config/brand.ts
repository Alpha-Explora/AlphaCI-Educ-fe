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
  /**
   * Under the circled CTA, which goes to the STUDENT door. Names that audience
   * so the quieter staff link below it has something to contrast with — a hint
   * reading "students, teachers and IT staff" directly above a separate staff
   * link would make the link look redundant when it is the opposite.
   */
  ctaHint: "For students. No GitHub account needed — your work is set up for you.",
  /** The staff door, one line below. A signpost, not a second CTA. */
  staffCtaLabel: "Teacher or IT staff? Sign in here",
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
  /**
   * ONE short line. The panel's explaining is done by the animated run beside
   * it, not by prose; the paragraph that used to live here was three clauses
   * long and sat next to a form, which is the worst possible place to ask
   * anyone to read.
   */
  body: "Push your work. See what passed.",
} as const;

/**
 * The sign-in badge — the lanyard ID card the auth form lives inside.
 *
 * The metaphor is doing real work, not decoration: every reader of this page
 * already owns a school ID, already knows it hangs round your neck, and already
 * knows it is the thing that gets you through a door. Signing in IS that, so
 * the form is printed on the pass rather than floated on a panel beside one.
 *
 * Everything here is on the CARD FACE, which is why it is worded like stamped
 * card stock and not like UI. Keep these short: they are printed in small caps
 * on a 24rem card and the second line of any of them would break the layout.
 */
export const badgeCopy = {
  /** Sits under the wordmark on the blue header. What the pass IS. */
  kind: "Lab access pass",
  /**
   * The strip along the card's foot, beside the barcode. A pass has an issue
   * line; this is ours. NOT a real credential and never rendered as one — it
   * is aria-hidden, like the barcode next to it.
   */
  serial: "AE · CLASS OF 2026",
  /** The little pill at bottom-right of the card. One word if you can. */
  status: "Issued",
  // NOTE: there is no drag/pull hint here because there is nothing to hint at.
  // The pass used to swing when grabbed and throw confetti when released; that
  // interaction was removed (see LanyardBadge.tsx) so the first screen on a
  // shared lab PC is something you read and pass through, not something you
  // play with. The card is now purely a picture of a pass.
} as const;

/**
 * The quiet copy either side of the pass.
 *
 * Everything here is DECORATIVE — the columns holding it are aria-hidden, and
 * every fact in them is also available to a screen-reader user from the form
 * itself or from the page they arrived from. It exists because a centred card
 * on an empty field reads as unfinished, not because a sign-in needs prose.
 *
 * The bar for adding a line here: it must be TRUE and CHECKABLE. No invented
 * metrics, no "10,000 students", no fake activity — this is a school product
 * and the one thing it cannot do on its front door is lie about a number.
 */
export const authAside = {
  /**
   * What happens after the button. Three steps, present tense, second person.
   * Deliberately ends at the push rather than at a grade: the product's
   * promise is the checked run, and promising more on a login screen is
   * writing a cheque the dashboard has to cash.
   */
  stepsTitle: "Your first three minutes",
  steps: [
    "Sign in with the email your school issued.",
    "Open your project in VS Code.",
    "Push — the checks start on their own.",
  ],
  /** Foot of the copy column. The one thing to do when this page fails. */
  helpTitle: "Can't get in?",
  helpBody: "Your teacher or the IT office can reset your password.",
  workspaceEyebrow: "Inside your workspace",
  workspaceTitle: "Everything for class, together.",
  workspaceBody:
    "Move from the brief to your latest result without hunting through different tools.",
  workspaceItems: [
    {
      icon: "school",
      title: "Class projects",
      body: "Open the assignments and starter work prepared by your teacher.",
    },
    {
      icon: "feedback",
      title: "Clear push feedback",
      body: "See build, test, and style results after every push.",
    },
    {
      icon: "deadline",
      title: "Your run history",
      body: "Return to earlier results and understand what changed.",
    },
  ],
  accessTitle: "No GitHub sign-in required",
  accessBody: "Your school account opens the workspace set up for your class.",
} as const;

/**
 * The same columns, beside the STAFF door.
 *
 * Same shape as `authAside` — deliberately, so AuthShell can take either
 * without branching — but every line is re-aimed. The student version narrates
 * a first push from VS Code, which is not what a teacher came here to do and
 * not something she will do at all: staff never push to a student repository.
 *
 * The help line differs for the same reason and matters more. A student who
 * cannot get in asks a teacher. A teacher who cannot get in has nobody above
 * her in the product except IT — and if she has not been invited yet, no amount
 * of retrying this form will help. Saying so is the only useful thing this
 * column can do.
 */
export const staffAuthAside = {
  stepsTitle: "What you can do here",
  steps: [
    "See every class you teach, and who is in them.",
    "Watch each push get built, tested and marked.",
    "Set the work, then read the results as they land.",
  ],
  helpTitle: "No account yet?",
  // One clause. AuthHelp now prints the title and this body as a single running
  // line, so anything longer wraps into the three-line paragraph this replaced.
  helpBody: "Ask your IT administrator to add you — they'll email an invite.",
  /** Overrides the student footnote, which tells the reader to ask a teacher. */
  footnote: "Any address works here — it does not have to be a school one.",
  workspaceEyebrow: "Inside your workspace",
  workspaceTitle: "Your classes at a glance.",
  workspaceBody:
    "Keep class setup, student activity, and pipeline results in one teaching view.",
  workspaceItems: [
    {
      icon: "school",
      title: "Class overview",
      body: "Open every class you teach and see who is taking part.",
    },
    {
      icon: "run",
      title: "Live pipeline runs",
      body: "Follow builds and tests as student pushes arrive.",
    },
    {
      icon: "feedback",
      title: "Review and feedback",
      body: "Read results, inspect submissions, and mark the work.",
    },
  ],
  accessTitle: "Staff access stays separate",
  accessBody: "Use the account your IT administrator invited you with.",
} as const;

/**
 * The replayable run on the auth panel: three stages, then the marks.
 *
 * `stages` are the phases of a pipeline; `marks` are what a student actually
 * gets back. Keeping them as two lists rather than one is the point of the
 * thing — the stages say WHEN, the marks say WHAT, and a class needs both
 * words before their first red build.
 *
 * `icon` keys into LANDING_ICONS so this stays a plain data file.
 */
export const runCard = {
  stages: [
    { icon: "push", label: "Push" },
    { icon: "run", label: "Build" },
    { icon: "test", label: "Test" },
  ],
  /**
   * Phrased as a marking sheet, not a log: "Tests pass", not
   * "jest --ci exited 0". This is the one place the product speaks to a
   * fourteen-year-old and a head of IT in the same three lines.
   */
  marks: ["Project builds", "Tests pass", "Style is clean"],
  verdict: "All checks passed",
  // NOTE: no replay hint. Hovering the run still replays it — the label
  // saying so was a caption on a decoration, which is one more thing to read
  // on a page whose whole job is two fields and a button.
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
