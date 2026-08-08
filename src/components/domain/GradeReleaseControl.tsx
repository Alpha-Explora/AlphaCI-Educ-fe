"use client";
// ============================================================================
// VIEW LAYER — Teacher: publish or withhold marks for one assignment.
//
// Students see their pipeline results the moment a run finishes — which checks
// passed, and why the ones that failed did. They do NOT see a mark until this
// is switched on.
//
// The control is deliberately reversible and says so. A teacher who publishes
// and then spots a broken hidden test needs to pull marks back while they fix
// it; a one-way button would leave them re-grading in public.
// ============================================================================
import { useState } from "react";
import { assignmentsApi } from "@/models/api";
import { Banner, Button, Card, SectionHeading, GenericPill } from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";

export function GradeReleaseControl({
  assignmentId,
  releasedAt,
  repositoryCount,
  onChanged,
}: {
  assignmentId: string;
  releasedAt?: string;
  /** Shown in the button label when known; omitted keeps the label generic. */
  repositoryCount?: number;
  onChanged?: (releasedAt: string | undefined) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | undefined>(releasedAt);

  const released = Boolean(current);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const updated = await assignmentsApi.setGradesReleased(assignmentId, !released);
      setCurrent(updated.gradesReleasedAt);
      onChanged?.(updated.gradesReleasedAt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change grade visibility.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <SectionHeading
        title="Marks"
        subtitle={
          released
            ? "Students can see their marks for this project."
            : "Students can see their pipeline results, but not their marks."
        }
        action={
          <GenericPill tone={released ? "success" : "neutral"}>
            {released ? "Published" : "Withheld"}
          </GenericPill>
        }
      />

      {error && (
        <Banner tone="error" className="mt-3">
          {error}
        </Banner>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={toggle} disabled={pending} variant={released ? "secondary" : "primary"}>
          {pending
            ? "Working…"
            : released
              ? "Withhold marks"
              : repositoryCount === undefined
                ? "Publish marks"
                : `Publish marks to ${repositoryCount} student${repositoryCount === 1 ? "" : "s"}`}
        </Button>
        {released && current && (
          <span className="text-xs text-[var(--text-muted)]">
            Published {formatDateTime(current)}
          </span>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
        {released
          ? "Withholding marks again hides the numbers from students but changes nothing you have recorded — use it if you need to correct a rubric or a hidden test."
          : "Publishing reveals the recorded mark and your feedback for every submission in this project. It is reversible."}
      </p>
    </Card>
  );
}
