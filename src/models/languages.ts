// ============================================================================
// MODEL LAYER — Language reference.
//
// What the pipeline actually runs, per language, at each stage.
//
// MIRRORS cicd-workflow/languages/<key>/language.yml. Those manifests are the
// executable source of truth; this file is a vendored copy for the teacher's
// reference page, in the same way models/rubric.schema.json is a vendored copy
// of the rubric contract. When a manifest changes there, change it here in the
// same pull request — and see languages/README.md, which already lists the FE
// type union as step 4 of adding a language.
//
// Why a copy rather than an API call: the manifests live in a third repository
// that neither the frontend nor the backend checks out. The backend could not
// serve these without vendoring them too, which would be the same duplication
// one layer further from the person reading it.
//
// WHAT BELONGS IN `why`
// ---------------------
// Only the reasons a teacher would otherwise have to discover from a failed
// run. "Runs the tests" is not worth a line; "Maven needs `verify` rather than
// `test` or the coverage file is never written" is the whole point of the page.
// Several of these are load-bearing: they are the difference between a stage
// that grades and a stage that reports zero for everyone.
// ============================================================================

export type LanguageKey = "node" | "python" | "java" | "php";

/** Which pipeline stage runs a command — indexes PIPELINE_STAGES in rubric.ts. */
export type CommandStage = 1 | 2 | 4 | 5;

export interface LanguageCommand {
  stage: CommandStage;
  /** Matches the manifest's key under `commands:`. */
  id: string;
  label: string;
  /** Verbatim from the manifest. Shown monospaced; do not prettify. */
  command: string;
  /** One line: what this actually does. */
  what: string;
  /** The gotcha, where one exists. Omit rather than padding. */
  why?: string;
}

export interface LanguageProfile {
  key: LanguageKey;
  label: string;
  /** Files whose presence identifies this language in a repository. */
  detect: string[];
  toolchain: {
    runtime: string;
    version: string;
    /** Absent where the manifest declares no cache. */
    cache?: string;
    note?: string;
  };
  commands: LanguageCommand[];
  reports: {
    junit: string;
    coverage: string;
    coverageFormat: string;
  };
  integrity: {
    engine: "JPlag" | "Dolos";
    note?: string;
  };
  /** Where stage 5 writes the teacher's tests. Gitignored in the scaffold. */
  hiddenTestsPath: string;
}

export const LANGUAGES: readonly LanguageProfile[] = [
  {
    key: "node",
    label: "Node.js / TypeScript",
    detect: ["package.json"],
    toolchain: {
      runtime: "Node.js",
      version: "22",
      cache: "npm",
      note: "Dependency caching is enabled only when the project has a lockfile. A freshly scaffolded repository has none until its first install, and setup-node fails outright rather than warning when asked to cache without one.",
    },
    commands: [
      {
        stage: 1,
        id: "install",
        label: "Install dependencies",
        command: "npm ci --ignore-scripts",
        what: "Installs exactly what the lockfile pins, falling back to npm install when the student has not committed one yet.",
        why: "--ignore-scripts is a security control, not a speed setting. npm's postinstall hook runs arbitrary code from any dependency at install time — before stage 1 has established anything about this repository.",
      },
      {
        stage: 1,
        id: "syntax",
        label: "Parse check",
        command: "npx tsc --noEmit",
        what: "Type-checks the whole project without producing output files.",
        why: "Compiles but never executes, so stage 1 can answer 'does this even parse' before any student code has run.",
      },
      {
        stage: 2,
        id: "lint",
        label: "Style",
        command: "npx eslint src",
        what: "ESLint 9 with the typescript-eslint recommended rules, configured by eslint.config.mjs in the student's repository.",
      },
      {
        stage: 2,
        id: "format",
        label: "Formatting",
        command: "npx prettier --check .",
        what: "Checks formatting against the .prettierrc the scaffold ships.",
        why: "Check-only, never --write. A formatter that rewrote files would turn the student's next pull into a merge conflict they did not create.",
      },
      {
        stage: 4,
        id: "test",
        label: "Visible tests",
        command:
          "npx jest --coverage --coverageReporters=lcov --coverageReporters=json-summary --reporters=default --reporters=jest-junit",
        what: "Runs the student's own test suite and writes both an LCOV coverage file and a JUnit XML report.",
        why: "jest-junit must be a dependency of the project. Jest resolves a custom reporter by requiring it from the repository, and npx cannot supply it — npx installs the binary it runs, never that binary's internal requires.",
      },
      {
        stage: 5,
        id: "test-hidden",
        label: "Hidden tests",
        command: "npx jest tests/hidden --reporters=default --reporters=jest-junit",
        what: "Runs only the teacher's injected suite, reporting counts rather than assertion text.",
      },
    ],
    reports: { junit: "junit.xml", coverage: "coverage/lcov.info", coverageFormat: "LCOV" },
    integrity: { engine: "JPlag" },
    hiddenTestsPath: "tests/hidden",
  },
  {
    key: "python",
    label: "Python",
    detect: ["requirements.txt", "pyproject.toml"],
    toolchain: { runtime: "CPython", version: "3.12", cache: "pip" },
    commands: [
      {
        stage: 1,
        id: "install",
        label: "Install dependencies",
        command: "python -m pip install -r requirements.txt",
        what: "Installs the pinned dependencies, which include pytest, pytest-cov and ruff.",
      },
      {
        stage: 1,
        id: "syntax",
        label: "Parse check",
        command: "python -m compileall -q src",
        what: "Byte-compiles every module to prove it parses.",
        why: "compileall parses without importing. `python -c \"import app\"` would look equivalent and is not — importing executes module-level code, which is exactly what stage 1 must avoid.",
      },
      {
        stage: 2,
        id: "lint",
        label: "Style",
        command: "ruff check .",
        what: "Ruff with rules E, F and I — pycodestyle errors, pyflakes, and import ordering.",
        why: "Ruff replaces flake8, isort and pylint in one static binary. Across hundreds of pushes a day the 10-100x speed difference is real CI-minute money, and there is no plugin resolution to go wrong.",
      },
      {
        stage: 2,
        id: "format",
        label: "Formatting",
        command: "ruff format --check .",
        what: "Checks formatting at the 100-column width set in pyproject.toml.",
      },
      {
        stage: 4,
        id: "test",
        label: "Visible tests",
        command: "pytest --cov --cov-report=xml --cov-report=term --junitxml=junit.xml",
        what: "Runs the suite, writing Cobertura coverage and a JUnit report.",
      },
      {
        stage: 5,
        id: "test-hidden",
        label: "Hidden tests",
        command: "pytest tests/hidden --junitxml=junit-hidden.xml",
        what: "Runs only the teacher's injected suite.",
      },
    ],
    reports: { junit: "junit.xml", coverage: "coverage.xml", coverageFormat: "Cobertura" },
    integrity: {
      engine: "JPlag",
      note: "JPlag's module for this language is named python3, not python.",
    },
    hiddenTestsPath: "tests/hidden",
  },
  {
    key: "java",
    label: "Java (Maven)",
    detect: ["pom.xml"],
    toolchain: { runtime: "Temurin JDK", version: "21", cache: "maven" },
    commands: [
      {
        stage: 1,
        id: "install",
        label: "Install dependencies",
        command: "mvn -B -q dependency:go-offline",
        what: "Resolves the entire dependency tree up front so later phases need no network.",
        why: "A student who adds a dependency gets a clear failure here rather than a confusing one part-way through a test run.",
      },
      {
        stage: 1,
        id: "syntax",
        label: "Parse check",
        command: "mvn -B -q compile -DskipTests",
        what: "Compiles main sources without running anything.",
      },
      {
        stage: 2,
        id: "lint",
        label: "Style",
        command: "mvn -B checkstyle:check pmd:check",
        what: "Checkstyle against the education ruleset in the student's checkstyle.xml, plus PMD's curated default rules.",
        why: "The ruleset is committed to the student's own repository rather than held in the pipeline, so `mvn checkstyle:check` on their laptop gives the same answer their mark was based on. It deliberately omits the Sun defaults — mandatory Javadoc, magic numbers, 80-column lines — which report hundreds of findings on correct beginner code.",
      },
      {
        stage: 2,
        id: "format",
        label: "Formatting",
        command: "mvn -B spotless:check",
        what: "Checks for unused imports only.",
        why: "Spotless is deliberately not running a full formatter. google-java-format reindents to two spaces and the scaffold is generated at four, so a complete format check would fail on a repository the student has never opened. Indentation is checked by Checkstyle instead, at the width actually used.",
      },
      {
        stage: 4,
        id: "test",
        label: "Visible tests",
        command: "mvn -B verify",
        what: "Runs the suite and writes the JaCoCo coverage report.",
        why: "`verify`, not `test`. JaCoCo's report goal is bound to the verify phase; with `test` the coverage file is never written and the coverage gate fails on a missing report rather than on real coverage.",
      },
      {
        stage: 5,
        id: "test-hidden",
        label: "Hidden tests",
        command: "mvn -B verify -Dtest='hidden/**' -DfailIfNoTests=false",
        what: "Runs only the teacher's injected suite.",
      },
    ],
    reports: {
      junit: "target/surefire-reports/*.xml",
      coverage: "target/site/jacoco/jacoco.xml",
      coverageFormat: "JaCoCo",
    },
    integrity: { engine: "JPlag" },
    hiddenTestsPath: "src/test/java/hidden",
  },
  {
    key: "php",
    label: "PHP",
    detect: ["composer.json"],
    toolchain: {
      runtime: "PHP",
      version: "8.3",
      note: "Coverage uses pcov rather than xdebug. Xdebug is a full debugger and runs coverage 2-5x slower; for line coverage pcov does identical work at a fraction of the cost.",
    },
    commands: [
      {
        stage: 1,
        id: "install",
        label: "Install dependencies",
        command: "composer install --no-interaction --prefer-dist --no-progress --no-scripts",
        what: "Installs PHPUnit and the lint tooling into vendor/.",
        why: "--no-scripts matters as much as npm's --ignore-scripts: composer's post-install-cmd runs project-authored code during dependency install, before stage 1 has established anything about the repository.",
      },
      {
        stage: 1,
        id: "syntax",
        label: "Parse check",
        command: "find src -name '*.php' -print0 | xargs -0 -n1 -P4 php -l",
        what: "Lints every file for parse errors, four at a time.",
        why: "`php -l` is parse-only and never executes the file.",
      },
      {
        stage: 2,
        id: "lint",
        label: "Style",
        command: "vendor/bin/phpcs && vendor/bin/phpstan analyse --no-progress",
        what: "PHP_CodeSniffer against phpcs.xml (PSR-12 without mandatory docblocks), then PHPStan at level 2.",
        why: "Invoked through vendor/bin because composer installs tools into the project, not onto PATH — the PHP runtime action supplies only php and composer themselves. Level 2 catches undefined variables, unknown methods and wrong argument counts; level 5 and above start demanding complete type declarations this course has not taught.",
      },
      {
        stage: 2,
        id: "format",
        label: "Formatting",
        command: "vendor/bin/php-cs-fixer check --diff",
        what: "Checks PSR-12 whitespace and syntax, showing a diff of what differs.",
        why: "Pinned to @PSR12 alone. The broader @Symfony and @PhpCsFixer rule sets reorder imports and rewrite comment style, which would fail the generated scaffold itself.",
      },
      {
        stage: 4,
        id: "test",
        label: "Visible tests",
        command: "vendor/bin/phpunit --coverage-clover coverage.xml --log-junit junit.xml",
        what: "Runs the suite, writing Clover coverage and a JUnit report.",
      },
      {
        stage: 5,
        id: "test-hidden",
        label: "Hidden tests",
        command: "vendor/bin/phpunit tests/hidden --log-junit junit-hidden.xml",
        what: "Runs only the teacher's injected suite.",
      },
    ],
    reports: { junit: "junit.xml", coverage: "coverage.xml", coverageFormat: "Clover" },
    integrity: {
      engine: "Dolos",
      note: "JPlag has no PHP module, so PHP alone uses Dolos. Both engines are normalised to one report shape, so a similarity percentage means the same thing whichever ran.",
    },
    hiddenTestsPath: "tests/hidden",
  },
] as const;

/** Stage 3 runs no per-language command — see QUALITY_NOTE. */
export const STAGES_WITHOUT_COMMANDS = [3, 6, 7] as const;

export function languageByKey(key: string): LanguageProfile | undefined {
  return LANGUAGES.find((l) => l.key === key);
}

/** Commands for one language, grouped by the stage that runs them. */
export function commandsByStage(
  profile: LanguageProfile,
): { stage: CommandStage; commands: LanguageCommand[] }[] {
  const stages: CommandStage[] = [1, 2, 4, 5];
  return stages
    .map((stage) => ({
      stage,
      commands: profile.commands.filter((c) => c.stage === stage),
    }))
    .filter((group) => group.commands.length > 0);
}
