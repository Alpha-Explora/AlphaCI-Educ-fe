"use client";
// ============================================================================
// VIEW LAYER — SonarCloud quality breakdown for one run
//
// The evidence behind stage ③'s marks. Every number here was measured at
// grading time and stored with the run, so a teacher defending a grade months
// later sees what the pipeline saw — not what SonarCloud reports about the
// repository today.
//
// Renders THREE states, and the distinction between the last two matters:
//   - measured        → the metric grid
//   - not measured    → excluded from the total, nobody was penalised
//   - no quality data → an older run, from before quality was reported at all
// ============================================================================
import type { PipelineQuality } from "@/models/types";
import { Banner, Card, cn } from "@/components/ui";

/** Sonar's A–E scale, worst to best, coloured the way the rating reads. */
const RATING_TONE: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  B: "bg-lime-50 text-lime-700 ring-lime-200",
  C: "bg-amber-50 text-amber-700 ring-amber-200",
  D: "bg-orange-50 text-orange-700 ring-orange-200",
  E: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function CodeQualityCard({
  quality,
  dashboardUrl,
  audience,
}: {
  quality: PipelineQuality | undefined;
  /** This repository's SonarCloud project. Teachers only — see below. */
  dashboardUrl?: string;
  audience: "student" | "teacher";
}) {
  if (!quality) {
    return (
      <Card className="p-4">
        <Heading />
        <Banner tone="info">
          This run was graded before code quality was recorded, so there are no
          measurements to show.
        </Banner>
      </Card>
    );
  }

  if (!quality.measured) {
    return (
      <Card className="p-4">
        <Heading />
        <Banner tone="warning">
          Code quality could not be measured for this run.{" "}
          {audience === "teacher"
            ? "Check that this repository has its SONAR_TOKEN, SONAR_PROJECT_KEY and SONAR_ORGANIZATION secrets — re-provisioning the repository writes them."
            : "This did not lower the mark: the component was left out of the total rather than scored as zero."}
        </Banner>
      </Card>
    );
  }

  const tone = RATING_TONE[quality.maintainability] ?? "bg-slate-50 text-slate-600 ring-slate-200";

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Heading />
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border-subtle)]">
          {quality.pointsAwarded}/{quality.pointsPossible} pts
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg text-2xl font-bold ring-1 ring-inset",
            tone,
          )}
        >
          {quality.maintainability}
        </span>
        <div className="min-w-0">
          {/*
            The debt ratio leads, with the letter demoted to a badge. The letter
            is what Sonar shows, but its A band spans 0-5% — the whole range a
            student project lives in — so it is the same "A" all term and tells a
            teacher nothing about whether this submission was careful. The ratio
            is the number the mark was computed from.
          */}
          <p className="text-sm font-semibold text-[var(--text-strong)]">
            {quality.debtRatio === null
              ? `Maintainability ${quality.maintainability}`
              : `${quality.debtRatio}% technical debt`}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {quality.debtRatio === null
              ? "Graded on the A–E rating — this project's Sonar did not report a debt ratio."
              : "Estimated time to fix everything found, as a share of the time the project took to write. Lower is better."}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Measure label="Bugs" value={quality.bugs} tone={quality.bugs > 0 ? "bad" : "good"} />
        <Measure
          label="Vulnerabilities"
          value={quality.vulnerabilities}
          tone={quality.vulnerabilities > 0 ? "bad" : "good"}
        />
        <Measure label="Code smells" value={quality.codeSmells} tone="neutral" />
        <Measure
          label="Duplication"
          value={`${quality.duplication}%`}
          tone={quality.duplication > 10 ? "warn" : "good"}
        />
      </dl>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Measured across {quality.ncloc.toLocaleString()} lines of code
        {quality.codeSmells > 0 && quality.ncloc > 0 && (
          <>
            {" "}
            {/*
              Density, not the raw count, because the count scales with project
              size — 30 smells means something very different in 200 lines than
              in 2,000. Not graded (the debt ratio already reflects smell effort);
              shown because it is the figure a teacher can compare across a class.
            */}
            (
            {((quality.codeSmells / quality.ncloc) * 1000).toFixed(1)} smells per
            1,000 lines)
          </>
        )}
        . Duplication is copy-paste <strong>within this project</strong> — it is
        not the similarity check against classmates.
      </p>

      {/*
        Teachers only. The SonarCloud project is world-readable (public repos on
        the free plan), so the link is not a secret — but sending a student to a
        dashboard that shows the raw mark would bypass the whole
        gradesReleasedAt gate the pipeline is careful to respect.
      */}
      {audience === "teacher" && dashboardUrl && (
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-600,#2563eb)] hover:underline"
        >
          Open in SonarCloud{" "}
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </Card>
  );
}

function Heading() {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
      Code quality — SonarCloud
    </p>
  );
}

function Measure({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass = {
    good: "text-emerald-700",
    warn: "text-amber-600",
    bad: "text-danger",
    neutral: "text-[var(--text-strong)]",
  }[tone];

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-slate-50/60 px-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className={cn("mt-0.5 text-lg font-semibold tabular-nums", toneClass)}>
        {value}
      </dd>
    </div>
  );
}
