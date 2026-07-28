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
          <tr className="border-b border-slate-200 text-left dark:border-slate-700">
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
                className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800"
              >
                <td className="py-3 pr-3">
                  <div className="font-medium">
                    {stage.number}. {stage.question}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">{stage.id}</div>
                </td>
                <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                  {stage.measures}
                  <div className="mt-1 text-xs text-slate-500">{stage.note}</div>
                </td>
                <td className="py-3 pr-3 tabular-nums">
                  {allocated ?? <span className="text-slate-400">—</span>}
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
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
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
                  className="border-l-2 border-slate-200 pl-4 dark:border-slate-700"
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
                      <span className="text-xs text-slate-500">
                        {field.choices.join(" · ")}
                      </span>
                    )}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                    {field.description}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Card>
      ))}

      <Card className="p-5">
        <SectionHeading title="Reading a disputed result" />
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
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
