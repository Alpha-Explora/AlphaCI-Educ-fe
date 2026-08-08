"use client";
// ============================================================================
// VIEW LAYER — "Check originality" (teacher action)
//
// Presentational only; the mutation lives in useOriginalityCheck.
//
// The result is written to be READ AS EVIDENCE. It reports what was excluded
// and what was skipped, not just a count of matches — a teacher who cannot see
// that the shared starter was removed has no reason to trust a similarity
// figure, and a teacher who cannot see who was skipped may read silence as a
// clean result.
// ============================================================================
import { useOriginalityCheck } from "@/viewmodels/useOriginalityCheck";
import { Banner, Button } from "@/components/ui";

export function OriginalityCheckButton({ assignmentId }: { assignmentId: string }) {
  const vm = useOriginalityCheck(assignmentId);
  const report = vm.report;
  const matches = report ? report.flagged.length + report.warned.length : 0;

  return (
    <div className="flex w-full flex-col items-end gap-2 sm:w-auto">
      <Button size="sm" variant="secondary" onClick={vm.run} loading={vm.isRunning}>
        Check originality
      </Button>

      {vm.error && (
        <Banner tone={vm.error.isNetworkError ? "network" : "error"} className="w-full">
          {vm.error.isNetworkError
            ? "Couldn't reach the backend to run the check."
            : vm.error.message}
        </Banner>
      )}

      {report && (
        <Banner
          tone={report.flagged.length > 0 ? "warning" : "info"}
          className="w-full"
          title={
            matches === 0
              ? "No high similarity found"
              : `${matches} pair${matches === 1 ? "" : "s"} to review`
          }
        >
          <p>
            Compared {report.compared} submission{report.compared === 1 ? "" : "s"}.{" "}
            {report.basecodeFiles} starter file{report.basecodeFiles === 1 ? "" : "s"} were
            excluded, so shared scaffold code is never counted against a student.
          </p>

          {/* Skipped is not the same as cleared, and the difference matters:
              these students were NOT checked. */}
          {report.skipped.length > 0 && (
            <p className="mt-2">
              {report.skipped.length} not compared —{" "}
              {report.skipped.length === 1
                ? report.skipped[0].reason
                : "mostly repositories with nothing but starter code yet"}
              .
            </p>
          )}

          {matches > 0 && (
            <p className="mt-2">
              Open each student to see the match. Similarity is a signal for you to
              review, never a penalty — no marks are affected.
            </p>
          )}
        </Banner>
      )}
    </div>
  );
}
