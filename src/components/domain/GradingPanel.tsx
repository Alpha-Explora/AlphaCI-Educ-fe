"use client";
// ============================================================================
// VIEW LAYER — Teacher grading panel
// Grade input + feedback + submit. All state/validation/mutations live in the
// useGrading ViewModel; this component is presentational.
// ============================================================================
import { useGrading } from "@/viewmodels/useGrading";
import type { AssignmentRepository, PipelineRun } from "@/models/types";
import { Banner, Button, Card, cn } from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";

export function GradingPanel({
  repo,
  maxPoints,
  pipelineRun,
}: Readonly<{
  repo: AssignmentRepository;
  maxPoints: number;
  /**
   * The run whose score can be copied into the grade — the latest on the branch
   * selected in the pipeline section, or null when there is none.
   *
   * The whole RUN, not just its number, because the button that applies it names
   * the branch and commit it came from. Selecting a branch in the pipeline
   * section changes which run this is, and a teacher who applied a `uat` result
   * believing it was `main` would have no way to notice — a value with no
   * provenance is not one to offer as a single click.
   */
  pipelineRun?: PipelineRun | null;
}>) {
  const vm = useGrading({
    repoId: repo.id,
    maxPoints,
    initialGrade: repo.grade,
    initialFeedback: repo.teacherFeedback,
    status: repo.status,
  });

  const notSubmitted = repo.status === "IN_PROGRESS";

  // The pipeline computes a score on every push; committing it to the gradebook
  // is the teacher's act. This removes the typing between those two facts without
  // removing the act — the score is filled in, and Submit is still pressed by a
  // person. Offered only when a score exists: `null` is either "no run yet" or a
  // student's redacted view, and neither has a number to apply.
  const suggested = pipelineRun?.score ?? null;
  const alreadyApplied = suggested !== null && vm.grade === String(suggested);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--text-strong)]">
          Grade &amp; feedback
        </h2>
        {vm.isGraded && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Graded {formatDateTime(repo.gradedAt)}
          </span>
        )}
      </div>

      {notSubmitted && (
        <Banner tone="info" className="mt-4">
          This repository hasn&rsquo;t been submitted yet. You can still record a grade, but
          students normally submit first.
        </Banner>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="grade-input"
            className="mb-1 block text-sm font-medium text-[var(--text-strong)]"
          >
            Grade{" "}
            <span className="font-normal text-[var(--text-muted)]">/ {maxPoints}</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="grade-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={maxPoints}
              value={vm.grade}
              onChange={(e) => vm.setGrade(e.target.value)}
              className={cn(
                "w-32 rounded-lg border px-3 py-2 text-base tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
                vm.validationError
                  ? "border-danger"
                  : "border-[var(--border-subtle)]",
              )}
            />

            {/*
              Fills the field; it does NOT save. Two clicks rather than one on
              purpose — the pipeline used to write the mark itself, and a student
              who had merely pushed appeared on the roster as marked work with a
              grade nobody had read. Keeping Submit as a separate press is what
              makes "Marked <date>" a true statement about a person.
            */}
            {suggested !== null && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => vm.setGrade(String(suggested))}
                disabled={alreadyApplied}
              >
                {alreadyApplied
                  ? `Pipeline score applied (${suggested}/${maxPoints})`
                  : `Use pipeline score: ${suggested}/${maxPoints}`}
              </Button>
            )}
          </div>

          {/*
            WHICH run that number came from. The pipeline section's branch toggle
            decides it, so without this the button offers a figure whose origin is
            off-screen — and a `uat` result applied as though it were `main` would
            leave no trace of the mistake.
          */}
          {suggested !== null && pipelineRun && (
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              From <code>{pipelineRun.branch}</code> ·{" "}
              <code>{pipelineRun.commitSha}</code> ·{" "}
              {pipelineRun.status === "PASSED" ? "pipeline passed" : "pipeline failed"}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="feedback-input"
            className="mb-1 block text-sm font-medium text-[var(--text-strong)]"
          >
            Feedback
          </label>
          <textarea
            id="feedback-input"
            rows={5}
            value={vm.feedback}
            onChange={(e) => vm.setFeedback(e.target.value)}
            placeholder="Leave manual code comments and guidance for the student…"
            className="w-full resize-y rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform"
          />
        </div>

        {vm.validationError && (
          <p className="text-sm font-medium text-danger" role="alert">
            {vm.validationError}
          </p>
        )}
        {vm.gradeError && (
          <Banner tone={vm.gradeError.isNetworkError ? "network" : "error"}>
            {vm.gradeError.isNetworkError
              ? "Couldn't reach the backend to save the grade."
              : vm.gradeError.message}
          </Banner>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={vm.submitGrade} loading={vm.isGrading}>
            {vm.isGraded ? "Update grade" : "Submit grade"}
          </Button>
          {vm.isGraded && !vm.isGrading && (
            <span className="text-sm text-success">Saved ✓</span>
          )}
        </div>
      </div>
    </Card>
  );
}
