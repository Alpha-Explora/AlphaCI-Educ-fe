"use client";
// ============================================================================
// VIEW LAYER — Teacher: how grading works.
//
// Every heading and paragraph below is read from rubric.schema.json, the same
// file the pipeline validates each rubric against. Nothing here is prose
// written for the UI, so the explanation a teacher reads cannot drift from
// what the pipeline actually does.
//
// Pass `rubric` to show this assignment's configured values beside each
// explanation; omit it for the general reference.
// ============================================================================
import { useMemo } from "react";
import {
  PIPELINE_STAGES,
  rubricSections,
  rubricValueAt,
  type Rubric,
} from "@/models/rubric";
import { Banner, Card, SectionHeading, GenericPill, cn } from "@/components/ui";

function StageTable({ rubric }: { rubric: Rubric | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border-strong)] text-left text-[var(--text-strong)]">
            <th className="py-2 pr-3 font-medium">Stage</th>
            <th className="py-2 pr-3 font-medium">What it measures</th>
            <th className="py-2 pr-3 font-medium">Points</th>
            <th className="py-2 font-medium">On failure</th>
          </tr>
        </thead>
        <tbody>
          {PIPELINE_STAGES.map((stage) => {
            const allocated = stage.points
              ? rubricValueAt(rubric, `points.${stage.points}`)
              : null;
            return (
              <tr
                key={stage.id}
                className="border-b border-[var(--border-subtle)] align-top last:border-0"
              >
                <td className="py-3 pr-3">
                  <div className="font-medium">
                    {stage.number}. {stage.question}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-muted)]">{stage.id}</div>
                </td>
                <td className="py-3 pr-3 text-[var(--text-strong)]">
                  {stage.measures}
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{stage.note}</div>
                </td>
                <td className="py-3 pr-3 tabular-nums">
                  {allocated ?? <span className="text-[var(--text-muted)]">—</span>}
                </td>
                <td className="py-3">
                  <GenericPill tone={stage.blocks ? "danger" : "neutral"}>
                    {stage.blocks ? "Stops the run" : "Deducts only"}
                  </GenericPill>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RubricDocumentation({
  rubric = null,
  className,
}: {
  rubric?: Rubric | null;
  className?: string;
}) {
  const sections = useMemo(() => rubricSections(), []);

  return (
    <div className={cn("space-y-6", className)}>
      {rubric?.source === "fallback" && (
        <Banner tone="warning">
          The values shown are AlphaCI defaults, not this assignment&apos;s saved
          rubric. Any score produced while this is the case is marked provisional.
        </Banner>
      )}

      <Card className="p-5">
        <SectionHeading
          title="The pipeline, stage by stage"
          subtitle="Every push a student makes runs these seven stages in order. The questions are the wording students see in their own results, so you and they describe a run the same way."
        />
        <div className="mt-4">
          <StageTable rubric={rubric} />
        </div>
      </Card>

      {sections.map((section) => (
        <Card key={section.key} className="p-5">
          <SectionHeading title={section.title} />
          {section.description && (
            <p className="mt-1 whitespace-pre-line text-sm text-[var(--text-strong)]">
              {section.description}
            </p>
          )}

          <dl className="mt-4 space-y-4">
            {section.fields.map((field) => {
              const value = rubricValueAt(rubric, field.path);
              const locked = field.fixedValue !== undefined;

              return (
                <div
                  key={field.path}
                  className="border-l-2 border-platform-200 pl-4"
                >
                  <dt className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{field.title}</span>
                    {locked ? (
                      <GenericPill tone="neutral">
                        Always {field.fixedValue === "false" ? "off" : "on"}
                      </GenericPill>
                    ) : value !== null ? (
                      <GenericPill tone="info">{value}</GenericPill>
                    ) : null}
                    {field.choices && !locked && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {field.choices.join(" · ")}
                      </span>
                    )}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm text-[var(--text-strong)]">
                    {field.description}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Card>
      ))}

      {/*
        The three cards below are hand-written, unlike everything above them,
        because they describe pipeline BEHAVIOUR rather than a rubric field.
        rubric.schema.json can document what `fullCreditDebtRatio` means; it has
        nowhere to say "an unmeasured component is removed from the denominator".
      */}
      <Card className="p-5">
        <SectionHeading
          title="How a code quality score is reached"
          subtitle="Stage 3 is graded on SonarCloud's continuous technical debt ratio, not on its A–E letter."
        />
        <div className="mt-3 space-y-3 text-sm text-[var(--text-strong)]">
          <p>
            The familiar A–E maintainability rating is a rounding of that ratio,
            and its <strong>A band spans 0–5%</strong> — which is the entire range
            a small student project occupies. Graded on the letter, a careful
            submission and a careless one both score full marks. Graded on the
            ratio, they separate:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-strong)] text-left text-[var(--text-strong)]">
                  <th className="py-2 pr-3 font-medium">A 500-line submission</th>
                  <th className="py-2 pr-3 font-medium">Debt</th>
                  <th className="py-2 pr-3 font-medium">Letter</th>
                  <th className="py-2 font-medium">Quality marks</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Careful — about 10 smells", "0.7%", "A", "100%"],
                  ["Moderate — about 25 smells", "1.7%", "A", "97%"],
                  ["Careless — about 50 smells", "3.5%", "A", "69%"],
                  ["Poor — about 100 smells", "6.9%", "B", "17%"],
                ].map(([profile, debt, letter, marks]) => (
                  <tr
                    key={profile}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td className="py-2.5 pr-3">{profile}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{debt}</td>
                    <td className="py-2.5 pr-3">{letter}</td>
                    <td className="py-2.5 tabular-nums font-medium text-[var(--text-strong)]">
                      {marks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Shown as a share of the quality points available, because the absolute
            figure depends on the assignment&apos;s own total. Bugs,
            vulnerabilities and excess duplication are then deducted from this
            result, and the component floors at zero.
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeading
          title="When a stage cannot be measured"
          subtitle="An unmeasured component is removed from the total — never scored as zero."
        />
        <div className="mt-3 space-y-3 text-sm text-[var(--text-strong)]">
          <p>
            If SonarCloud is not configured for a repository, or an analysis does
            not finish in time, stage 3 reports{" "}
            <strong>not measured</strong> and its points leave the denominator.
            A student graded this way is neither credited nor penalised for
            infrastructure they do not control.
          </p>
          <p>
            The two alternatives are both worse. Awarding the points in full — the
            original behaviour — hides a broken setup behind a plausible mark, so
            an assignment can go a whole term ungraded on quality without anyone
            noticing. Scoring zero caps a student&apos;s grade because a token
            expired.
          </p>
          <Banner tone="warning">
            You will see this on a repository&apos;s page as a warning beside the
            pipeline, and on each run&apos;s quality card. It is worth acting on:
            re-provisioning the repository rewrites its Sonar secrets.
          </Banner>
          <p>
            Hidden tests in <strong>secure</strong> mode are excluded the same way
            while AlphaCI grades them separately, which is why a percentage can
            appear before every stage has reported.
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeading title="Reading a disputed result" />
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--text-strong)]">
          <li>
            Every graded run records the exact pipeline revision that produced
            it, so a score can be reproduced later even though the pipeline is
            updated continuously.
          </li>
          <li>
            A run marked <strong>provisional</strong> was graded against default
            thresholds because AlphaCI could not be reached. Re-run it before
            treating the mark as final.
          </li>
          <li>
            Integrity findings never change a score. They appear in your review
            queue with the evidence that produced them.
          </li>
        </ul>
      </Card>
    </div>
  );
}
