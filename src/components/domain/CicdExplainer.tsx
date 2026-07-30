"use client";
// ============================================================================
// VIEW LAYER — Student: what CI/CD is and how it grades your work.
//
// The stage-by-stage content is read from PIPELINE_STAGES (models/rubric.ts),
// the same list the teacher's grading reference renders. Only the voice differs:
// this component uses each stage's `forStudent` copy, the teacher's uses
// `measures`/`note`. Sharing the source means a stage cannot be renumbered or
// re-scoped for one audience and left stale for the other.
//
// Deliberately contains NO marks, thresholds or point values. Those belong to an
// assignment's rubric and vary between them; a student reading a hardcoded "35
// points" here would be misled on any assignment configured differently.
// ============================================================================
import { PIPELINE_STAGES } from "@/models/rubric";
import { Banner, Card, SectionHeading, GenericPill, cn } from "@/components/ui";

export function CicdExplainer({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* ── What it is ──────────────────────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeading
          title="What is CI/CD?"
          subtitle="The short version: a robot reviewer that checks your work every time you push."
        />
        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>
            <strong className="text-[var(--text-strong)]">
              CI stands for Continuous Integration.
            </strong>{" "}
            Every time you push code to GitHub, your project is copied onto a
            fresh computer in the cloud, built from scratch, and checked. You do
            not set any of this up and you do not run it yourself — it starts on
            its own the moment your push lands.
          </p>
          <p>
            <strong className="text-[var(--text-strong)]">
              CD stands for Continuous Delivery.
            </strong>{" "}
            In industry, that is the second half: code that passes every check
            gets released to real users automatically. On this course you are
            practising the CI half, which is where the checking happens.
          </p>
          <p>
            Professional teams rely on this because &ldquo;it works on my
            machine&rdquo; is not good enough. A fresh cloud machine has none of
            your local setup, so if your project only builds because of something
            installed on your laptop, CI is what catches it.
          </p>
        </div>
      </Card>

      {/* ── The loop ────────────────────────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeading
          title="What happens when you push"
          subtitle="You do nothing here except push. Everything below runs by itself."
        />
        <ol className="mt-4 space-y-3">
          {[
            {
              label: "You push your code",
              body: "Commit and push as normal, either to a branch or through a pull request into main.",
            },
            {
              label: "The pipeline wakes up",
              body: "GitHub Actions sees the push and starts your pipeline. You will see a yellow dot next to your commit while it runs.",
            },
            {
              label: "Seven stages run in order",
              body: "Each one asks a different question about your code. Some stop the run if they fail; most just record a result and continue.",
            },
            {
              label: "You get feedback",
              body: "Open the run to see which stages passed, which failed, and why. This is the part worth reading — it tells you what to fix next.",
            },
            {
              label: "You fix and push again",
              body: "There is no penalty for pushing many times. Iterating against the feedback is exactly how the tool is meant to be used.",
            },
          ].map((step, idx) => (
            <li key={step.label} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-platform-50 text-xs font-semibold text-platform-800"
              >
                {idx + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-strong)]">
                  {step.label}
                </p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* ── The stages ──────────────────────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeading
          title="The seven stages"
          subtitle="These are the same questions you will see in your own run, in the same order."
        />
        <ol className="mt-4 space-y-3">
          {PIPELINE_STAGES.map((stage) => (
            <li
              key={stage.id}
              className="rounded-lg border border-[var(--border-subtle)] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-strong)]">
                  {stage.number}. {stage.question}
                </span>
                {/*
                  Only the blocking stages are badged. Marking the other five
                  "does not stop the run" would bury the two facts that actually
                  change what a student does next.
                */}
                {stage.blocks && (
                  <GenericPill tone="danger">Stops the run if it fails</GenericPill>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {stage.forStudent.meaning}
              </p>
              <p className="mt-2 border-l-2 border-platform-100 pl-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-[var(--text-strong)]">
                  What to do:
                </span>{" "}
                {stage.forStudent.whatToDo}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      {/* ── Code quality, explained ─────────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeading
          title="Understanding your code quality score"
          subtitle="Stage 3 is the one students find most surprising, because working code can still score badly."
        />
        <dl className="mt-4 space-y-4 text-sm">
          <div className="border-l-2 border-slate-200 pl-4 dark:border-slate-700">
            <dt className="font-medium text-[var(--text-strong)]">
              Technical debt
            </dt>
            <dd className="mt-1 text-slate-600 dark:text-slate-300">
              An estimate of how long it would take to fix everything
              questionable SonarCloud found, expressed as a percentage of how
              long it estimates your project took to write. Lower is better, and
              it drops every time you fix something — so it is worth watching
              between pushes.
            </dd>
          </div>
          <div className="border-l-2 border-slate-200 pl-4 dark:border-slate-700">
            <dt className="font-medium text-[var(--text-strong)]">Duplication</dt>
            <dd className="mt-1 text-slate-600 dark:text-slate-300">
              How much of your code is copy-pasted from{" "}
              <strong>elsewhere in your own project</strong>. This is not the
              similarity check against your classmates — that is stage 6, and it
              is completely separate. Fix duplication by moving the repeated
              block into one function and calling it twice.
            </dd>
          </div>
          <div className="border-l-2 border-slate-200 pl-4 dark:border-slate-700">
            <dt className="font-medium text-[var(--text-strong)]">
              Bugs and vulnerabilities
            </dt>
            <dd className="mt-1 text-slate-600 dark:text-slate-300">
              A &ldquo;bug&rdquo; here is code that will demonstrably misbehave —
              an unreachable branch, a comparison that can never be true — not a
              style opinion. A &ldquo;vulnerability&rdquo; is something with a
              security consequence, such as a password written directly into a
              file.
            </dd>
          </div>
          <div className="border-l-2 border-slate-200 pl-4 dark:border-slate-700">
            <dt className="font-medium text-[var(--text-strong)]">Code smells</dt>
            <dd className="mt-1 text-slate-600 dark:text-slate-300">
              Things that are not wrong but make code harder to work with later —
              a function doing too many jobs, a name that says nothing, a
              condition nested five levels deep. These are not deducted
              individually; they feed into your technical debt.
            </dd>
          </div>
        </dl>
        <Banner tone="info" className="mt-4">
          If your run says code quality was <strong>not measured</strong>, that is
          a setup problem on your teacher&apos;s side, not something you did. It
          does not lower your mark — the stage is left out of the total instead of
          being scored as zero.
        </Banner>
      </Card>

      {/* ── Fair-play notes ─────────────────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeading title="Two things students always ask" />
        <div className="mt-3 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div>
            <p className="font-medium text-[var(--text-strong)]">
              Why can&apos;t I see the hidden tests?
            </p>
            <p className="mt-1">
              Because code written to satisfy a test you can read is not the same
              as code that actually works. You can always see{" "}
              <strong>what your code did wrong</strong> when a hidden test fails —
              the case it was given and what it should have produced. That is
              enough to fix the logic, which is the skill being assessed.
            </p>
          </div>
          <div>
            <p className="font-medium text-[var(--text-strong)]">
              Why doesn&apos;t my run show my mark?
            </p>
            <p className="mt-1">
              Your teacher releases marks for the whole class once they have
              reviewed the runs. Two reasons: a mark that appeared instantly could
              not be corrected if a test turned out to be broken, and a live score
              on every push turns the assignment into a scoreboard. The technical
              feedback is immediate — only the number waits.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Troubleshooting ─────────────────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeading
          title="When something goes wrong"
          subtitle="The most common first-run problems, and where to look."
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="py-2 pr-3 font-medium">What you see</th>
                <th className="py-2 font-medium">What it usually means</th>
              </tr>
            </thead>
            <tbody className="text-slate-600 dark:text-slate-300">
              {[
                [
                  "Everything after stage 1 is skipped",
                  "Your project did not install or did not parse. Fix stage 1 first — nothing else can run until it passes.",
                ],
                [
                  "Tests pass locally but fail in the pipeline",
                  "Something on your machine is not in the repository. A file you did not commit, or a package you installed locally but did not add to package.json.",
                ],
                [
                  "The run never started",
                  "Check you pushed to a branch the pipeline watches. Pushes to scratch branches are deliberately not graded, to keep the run count down.",
                ],
                [
                  "A stage says “not measured”",
                  "An external service could not be reached. It is excluded from your total rather than scored as zero, so it has not cost you marks.",
                ],
                [
                  "Your run was cancelled",
                  "You pushed again while it was still running. Only the newest push is graded — the older run is stopped on purpose.",
                ],
              ].map(([symptom, cause]) => (
                <tr
                  key={symptom}
                  className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800"
                >
                  <td className="py-3 pr-3 font-medium text-[var(--text-strong)]">
                    {symptom}
                  </td>
                  <td className="py-3">{cause}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
