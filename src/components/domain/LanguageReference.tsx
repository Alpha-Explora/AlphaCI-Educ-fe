"use client";
// ============================================================================
// VIEW LAYER — Teacher: what the pipeline runs, per language.
//
// The companion to RubricDocumentation. That page answers "what is measured and
// what is it worth"; this one answers "what command produced that result".
//
// Both questions arrive together the first time a teacher has to explain a mark
// to a student — which is why the stage numbers here are the same numbers, in
// the same order, with the same student-facing questions as the rubric page.
// They are read from PIPELINE_STAGES rather than retyped so the two pages
// cannot drift apart.
//
// Tabbed rather than stacked because the four languages are alternatives, not a
// sequence: a teacher running a Java course has no use for scrolling past
// Python. The tab strip also keeps every language's stage ordering identical,
// so the comparison a head of department wants ("what does lint mean in each?")
// is a horizontal move rather than a hunt.
// ============================================================================
import { useState } from "react";
import {
  LANGUAGES,
  commandsByStage,
  type LanguageKey,
  type LanguageProfile,
} from "@/models/languages";
import { PIPELINE_STAGES } from "@/models/rubric";
import {
  Card,
  SectionHeading,
  Tabs,
  CopyButton,
  cn,
  type TabItem,
} from "@/components/ui";

/*
  The tab names the project types it pools, not the runtime.

  "Node.js / TypeScript" is the correct name for the pipeline and the wrong word
  to scan for: a teacher who set a project to React reads four tabs, sees no
  React, and stops — which is where this question actually gets asked, before any
  clicking. Derived from `stacks` rather than written out, so adding a fifth
  JavaScript project type updates the tab and the panel from one edit.
*/
const TABS: TabItem<LanguageKey>[] = LANGUAGES.map((l) => ({
  id: l.key,
  label: l.stacks.length > 1 ? l.stacks.join(" · ") : l.label,
}));

function stageQuestion(number: number): string {
  return PIPELINE_STAGES.find((s) => s.number === number)?.question ?? "";
}

/** One command: what runs, verbatim, and why it is written that way. */
function CommandRow({
  label,
  command,
  what,
  why,
}: {
  label: string;
  command: string;
  what: string;
  why?: string;
}) {
  return (
    <div className="border-l-2 border-platform-200 pl-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
      </div>
      {/*
        The command is the reason a teacher opened this page, so it is selectable
        and copyable rather than prose. `break-all` because these run past any
        container width — the jest invocation is 130 characters — and a
        horizontal scrollbar per row would be worse than a wrap.
      */}
      <div className="mt-1.5 flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-[var(--bg-subtle)] px-2 py-1.5 font-mono text-xs text-[var(--text-strong)]">
          {command}
        </code>
        <CopyButton value={command} />
      </div>
      <p className="mt-2 text-sm text-[var(--text-strong)]">{what}</p>
      {why && (
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          <span className="font-medium">Why it is written this way — </span>
          {why}
        </p>
      )}
    </div>
  );
}

function LanguagePanel({ profile }: { profile: LanguageProfile }) {
  const groups = commandsByStage(profile);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeading
          title="Toolchain"
          subtitle="Installed on a clean runner for every push. Nothing is carried over between runs."
        />

        {/*
          FIRST, and above the toolchain detail, because it is the question this
          page gets asked: "where is React?". A teacher picks from seven project
          types and this page has four tabs, so without this the four JavaScript
          types look unsupported rather than pooled. Only rendered when a language
          really does pool several — a lone "Covers: PHP" would be noise.
        */}
        {profile.stacks.length > 1 && (
          <div className="mt-4 rounded-lg border border-platform-200 bg-platform-50 px-4 py-3">
            <p className="text-xs font-medium text-platform-800">
              Covers these project types
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {profile.stacks.map((stack) => (
                <span
                  key={stack}
                  className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-platform-800 ring-1 ring-inset ring-platform-200"
                >
                  {stack}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              All of them are {profile.detect.join(" / ")} projects, so the
              pipeline runs exactly the commands below for each — there is no
              separate React or Next.js build.
            </p>
          </div>
        )}

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Runtime</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {profile.toolchain.runtime} {profile.toolchain.version}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Identified by</dt>
            <dd className="mt-0.5 flex flex-wrap gap-1.5">
              {profile.detect.map((file) => (
                <code
                  key={file}
                  className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-xs"
                >
                  {file}
                </code>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Coverage format</dt>
            <dd className="mt-0.5 text-sm">
              {profile.reports.coverageFormat}
              <code className="ml-2 font-mono text-xs text-[var(--text-muted)]">
                {profile.reports.coverage}
              </code>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">
              Similarity engine (stage 6)
            </dt>
            <dd className="mt-0.5 text-sm">{profile.integrity.engine}</dd>
          </div>
        </dl>
        {(profile.toolchain.note || profile.integrity.note) && (
          <div className="mt-4 space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
            {profile.toolchain.note && (
              <p className="text-xs text-[var(--text-muted)]">
                {profile.toolchain.note}
              </p>
            )}
            {profile.integrity.note && (
              <p className="text-xs text-[var(--text-muted)]">
                {profile.integrity.note}
              </p>
            )}
          </div>
        )}
      </Card>

      {groups.map(({ stage, commands }) => (
        <Card key={stage} className="p-5">
          <SectionHeading
            title={`Stage ${stage} — ${stageQuestion(stage)}`}
            subtitle={
              stage === 5
                ? `Injected into ${profile.hiddenTestsPath}, which the scaffold gitignores so a student cannot commit your tests back to a public repository.`
                : undefined
            }
          />
          <div className="mt-4 space-y-5">
            {commands.map((c) => (
              <CommandRow
                key={c.id}
                label={c.label}
                command={c.command}
                what={c.what}
                why={c.why}
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function LanguageReference({ className }: { className?: string }) {
  const [active, setActive] = useState<LanguageKey>("node");
  const profile = LANGUAGES.find((l) => l.key === active) ?? LANGUAGES[0];

  return (
    <div className={cn("space-y-6", className)}>
      <Card className="p-5">
        <SectionHeading
          title="Stages that run no language command"
          subtitle="Three of the seven stages are identical whichever language a class works in."
        />
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-medium">Stage 3 — Is your code maintainable?</dt>
            <dd className="mt-0.5 text-[var(--text-strong)]">
              SonarCloud scans the checked-out files; it runs nothing the student
              wrote. This is the only reason it is allowed to hold an access
              token — the stages that execute student code deliberately receive
              none, because anything in their environment can be printed out by
              that code. Each language passes the scanner its own report paths so
              coverage and test results are attached to the analysis.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Stage 6 — Originality check</dt>
            <dd className="mt-0.5 text-[var(--text-strong)]">
              Fingerprints the submission and compares it across the class. Worth
              no points and never blocks a run.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Stage 7 — Your result</dt>
            <dd className="mt-0.5 text-[var(--text-strong)]">
              Aggregates every stage against the rubric and reports it to AlphaCI.
              Always runs, so a student gets feedback even from a run that
              stopped at stage 1.
            </dd>
          </div>
        </dl>
      </Card>

      <div>
        <Tabs
          items={TABS}
          value={active}
          onChange={setActive}
          label="Languages"
          idPrefix="language-ref"
        />
        <div
          id={`language-ref-panel-${active}`}
          role="tabpanel"
          aria-labelledby={`language-ref-tab-${active}`}
          className="mt-6"
        >
          <LanguagePanel profile={profile} />
        </div>
      </div>

      <Card className="p-5">
        <SectionHeading title="Why one number means the same thing in every language" />
        <div className="mt-3 space-y-3 text-sm text-[var(--text-strong)]">
          <p>
            Each language reports coverage in its own format — JaCoCo, Cobertura,
            Clover, LCOV. The pipeline converts all four to one shape before
            comparing them against your threshold, so &ldquo;80% coverage&rdquo;
            means the same thing to a Java student and a Python student. Without
            that step, setting one number across a mixed cohort would be silently
            unfair.
          </p>
          <p>
            The same holds for the similarity check: PHP is analysed by Dolos and
            everything else by JPlag, and both are normalised to one report shape
            before you ever see a percentage.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Commands are set per language by AlphaCI, not per assignment. What you
            control is on the Grading page: the thresholds they are judged
            against, what each stage is worth, and which failures stop a run.
          </p>
        </div>
      </Card>
    </div>
  );
}
