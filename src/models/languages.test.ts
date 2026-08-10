// ============================================================================
// DRIFT GUARD — models/languages.ts vs the executable manifests.
//
// WHY THIS EXISTS
// ---------------
// models/languages.ts is a hand-maintained copy of cicd-workflow's
// languages/<key>/language.yml, and its header instructs whoever edits a
// manifest to edit the copy "in the same pull request". That is a process
// control guarding a correctness property, and it decayed exactly as process
// controls do: by 2026-08 the page was showing `npx eslint src` while the
// pipeline ran `npx eslint . --ignore-pattern '.pipeline/**'`, a Python parse
// check scoped to a folder that no longer exists in the command, and a Java
// hidden-test filter matching by path when the manifest matches by class name.
//
// This is the page a teacher opens to explain a mark to a student. Wrong
// commands here are not cosmetic — they are a teacher confidently describing a
// check that did not run.
//
// WHAT IT CHECKS, AND WHAT IT DOES NOT
// ------------------------------------
// Every `command` string we display must appear VERBATIM in the corresponding
// manifest, after comment lines are stripped. Comments are removed first
// because the manifests quote old command text in their own history notes —
// matching against those would let the copy pass while describing a command
// that has since changed, which is precisely the failure being guarded.
//
// It deliberately does NOT parse YAML. A substring check over the raw file is
// immune to quoting and anchor quirks, needs no dependency (`js-yaml` is
// present only transitively via eslint and would vanish on a lockfile change),
// and answers the only question that matters: is the text we show a teacher the
// text that runs?
//
// KNOWN LIMITATION — the manifests live in a THIRD repository that this one
// does not check out. Where it is not on disk these tests skip rather than
// fail, so on a CI runner that clones only the frontend they are a no-op. They
// hold the line on any machine with the sibling checkout, which is every
// developer's. Point CICD_WORKFLOW_PATH at the repo to run them elsewhere.
// ============================================================================
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LANGUAGES, type LanguageProfile } from "./languages";

const MANIFEST_ROOT =
  process.env.CICD_WORKFLOW_PATH ??
  path.resolve(import.meta.dirname, "..", "..", "..", "cicd-workflow");

const LANGUAGES_DIR = path.join(MANIFEST_ROOT, "languages");
const available = existsSync(LANGUAGES_DIR);

/**
 * The four manifests whose commands must stay byte-identical to each other.
 *
 * The page pools them behind one "Node.js / TypeScript" tab and tells the
 * teacher "the pipeline runs exactly the commands below for each — there is no
 * separate React or Next.js build". That sentence is only true while these four
 * agree, and nothing in the pipeline enforces it: they are four separate files.
 */
const NODE_FAMILY = ["node", "nestjs", "react", "nextjs"] as const;

/** Which manifest directory backs each tab on the page. */
const MANIFEST_FOR: Record<string, string> = {
  node: "node",
  python: "python",
  java: "java",
  php: "php",
};

function manifestText(key: string): string {
  return readFileSync(path.join(LANGUAGES_DIR, key, "language.yml"), "utf8");
}

/**
 * The manifest with its commentary removed.
 *
 * Line-based rather than a general YAML comment strip: a `#` inside a command
 * is part of the command, and these files have no trailing comments on value
 * lines. Only whole-line comments are dropped.
 */
function withoutComments(yaml: string): string {
  return yaml
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
}

/** Single-line `key: value` pairs under `commands:`, at their two-space indent. */
function commandMap(yaml: string): Record<string, string> {
  const keys = [
    "install",
    "syntax",
    "lint",
    "format",
    "lint-requires",
    "format-requires",
    "test",
    "test-hidden",
    "build",
  ];
  const out: Record<string, string> = {};
  for (const line of withoutComments(yaml).split("\n")) {
    const match = /^ {2}([a-z-]+):[ \t]+(.+)$/.exec(line);
    if (match && keys.includes(match[1])) out[match[1]] = match[2].trim();
  }
  return out;
}

describe.skipIf(!available)("languages.ts mirrors the pipeline manifests", () => {
  it("resolves the manifest directory", () => {
    expect(available, `No manifests at ${LANGUAGES_DIR}`).toBe(true);
  });

  for (const profile of LANGUAGES as readonly LanguageProfile[]) {
    describe(profile.label, () => {
      const yaml = withoutComments(manifestText(MANIFEST_FOR[profile.key]));

      for (const command of profile.commands) {
        // One assertion per command so a failure names the drifted check rather
        // than reporting "this language is wrong".
        it(`stage ${command.stage} — ${command.label} runs what we display`, () => {
          expect(
            yaml.includes(command.command),
            `models/languages.ts shows:\n  ${command.command}\n` +
              `…which does not appear in languages/${MANIFEST_FOR[profile.key]}/language.yml.\n` +
              `Update the vendored copy to match the manifest.`,
          ).toBe(true);
        });
      }

      it("declares the runtime version the manifest sets", () => {
        expect(yaml).toContain(`default-version: "${profile.toolchain.version}"`);
      });

      it("writes hidden tests where the manifest injects them", () => {
        expect(yaml).toContain(`inject-path: ${profile.hiddenTestsPath}`);
      });

      it("reads the coverage file the manifest produces", () => {
        expect(yaml).toContain(`coverage: ${profile.reports.coverage}`);
      });
    });
  }

  // The claim the page makes in prose, asserted directly. If someone fixes a
  // command in react/language.yml alone, the Node tab silently starts lying to
  // every teacher running a NestJS or Next.js class.
  it("keeps the four node-family manifests identical", () => {
    const [reference, ...others] = NODE_FAMILY.map((key) => ({
      key,
      commands: commandMap(manifestText(key)),
    }));

    expect(
      Object.keys(reference.commands).length,
      "parsed no commands out of node/language.yml — the indent convention changed",
    ).toBeGreaterThan(0);

    for (const other of others) {
      expect(
        other.commands,
        `languages/${other.key}/language.yml has diverged from languages/node/language.yml. ` +
          `The teacher's Languages page pools all four behind one tab and states they run ` +
          `identical commands, so either re-align them or give ${other.key} its own tab.`,
      ).toEqual(reference.commands);
    }
  });
});
