"use client";
// ============================================================================
// VIEW LAYER — Active workspace (student)
// Branch toggle, Get Lab Token, Submit for grading, CI/CD error logs (per-stage
// checks with human-readable hints; hidden tests masked), and a private Grades
// & Feedback area. Consumes useRepositoryDetail + useGrading (submit only).
// ============================================================================
import { useParams } from "next/navigation";
import { useRepositoryDetail } from "@/viewmodels/useRepositoryDetail";
import { useGrading } from "@/viewmodels/useGrading";
import {
  Banner,
  Button,
  Card,
  GenericPill,
  PipelineStatusPill,
  RepoStatusPill,
  Skeleton,
  StateBoundary,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { RepoRunsExplorer } from "@/components/domain/RepoRunsExplorer";
import { LabTokenPanel } from "@/components/domain/LabTokenPanel";
import { StartAssignmentPanel } from "@/components/domain/StartAssignmentPanel";
import { GithubActivityPanel } from "@/components/domain/GithubActivityPanel";
import { StudentGradesCard } from "@/components/domain/StudentGradesCard";
import { relativeDue } from "@/components/ui/format";

export default function StudentWorkspacePage() {
  const params = useParams<{ id: string }>();
  const repoId = params?.id ?? null;
  const vm = useRepositoryDetail(repoId);
  const d = vm.data;

  // Submission action reuses the grading VM's submit mutation.
  const submission = useGrading({
    repoId,
    maxPoints: d?.assignment.points ?? 100,
    initialGrade: d?.repo.grade ?? null,
    initialFeedback: d?.repo.teacherFeedback ?? null,
    status: d?.repo.status,
  });

  // ADDENDUM L — teacher ended (closed) the project: no push/token/submit.
  const closed = Boolean(d?.assignment.closedAt);
  const canSubmit = d?.repo.status === "IN_PROGRESS" && !closed;
  const alreadySubmitted =
    d?.repo.status === "SUBMITTED" || d?.repo.status === "GRADED";

  return (
    <div className="space-y-8">
      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        loadingFallback={
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        {d && (
          <>
            <PageHeader
              backHref="/student"
              backLabel="Assignment Hub"
              title={d.assignment.title}
              subtitle={<span className="font-mono text-xs">{d.repo.repoName}</span>}
              meta={
                <>
                  <RepoStatusPill status={d.repo.status} />
                  {d.assignment.isGroup && (
                    <GenericPill tone="info">Group project</GenericPill>
                  )}
                  <GenericPill>{d.assignment.points} pts</GenericPill>
                  <GenericPill tone="warning">{relativeDue(d.assignment.dueDate)}</GenericPill>
                </>
              }
              actions={
                <a
                  href={d.repo.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-github px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-github-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
                >
                  <span aria-hidden="true">↗</span> Open on GitHub
                </a>
              }
            />

            {/* Assignment brief */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Brief
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-strong)]">
                {d.assignment.description}
              </p>
            </Card>

            {closed && (
              <Banner tone="warning" title="Project closed">
                Your teacher has ended this project. You can no longer open it in VS
                Code, get a lab token, or submit. Your work and grades remain visible below.
              </Banner>
            )}

            {/* Actions: start-in-VS-Code (with manual lab-token fallback) + submit.
                Hidden once the teacher closes the project. */}
            {!closed && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-5">
                <StartAssignmentPanel repoId={d.repo.id} />
                <LabTokenPanel
                  token={vm.labToken}
                  onRequest={vm.requestLabToken}
                  isLoading={vm.isRequestingToken}
                  error={vm.labTokenError}
                />
              </div>

              <Card className="flex flex-col p-5">
                <h2 className="text-base font-semibold text-[var(--text-strong)]">
                  Submit for grading
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Lock in your current work on <strong>{vm.selectedBranch ?? "main"}</strong>{" "}
                  and send it to your teacher for review.
                </p>

                {submission.submitError && (
                  <Banner
                    tone={submission.submitError.isNetworkError ? "network" : "error"}
                    className="mt-4"
                  >
                    {submission.submitError.isNetworkError
                      ? "Couldn't reach the backend to submit."
                      : submission.submitError.message}
                  </Banner>
                )}

                <div className="mt-auto pt-4">
                  {alreadySubmitted ? (
                    <Banner tone="success">
                      Submitted — your teacher can now grade this repository.
                    </Banner>
                  ) : (
                    <Button
                      onClick={submission.submitForGrading}
                      loading={submission.isSubmitting}
                      disabled={!canSubmit}
                    >
                      <span aria-hidden="true">📤</span> Submit for grading
                    </Button>
                  )}
                </div>
              </Card>
            </div>
            )}

            {/* ADDENDUM M — real commits / branches / CI runs from GitHub */}
            <GithubActivityPanel repoId={d.repo.id} />

            {/* CI/CD error logs */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                  CI/CD results &amp; error logs
                </h2>
                {vm.latestRun && <PipelineStatusPill status={vm.latestRun.status} />}
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Public tests help you debug. Hidden tests run privately to prevent hard-coding —
                their details stay masked until grading.
              </p>
              {d.runs.length === 0 ? (
                <Banner tone="info">
                  No pipeline runs yet. Push code (or trigger a run) to see results here.
                </Banner>
              ) : (
                <RepoRunsExplorer
                  branches={d.branches}
                  selectedBranch={vm.selectedBranch}
                  onSelectBranch={vm.selectBranch}
                  runs={vm.runsForBranch}
                  audience="student"
                  onTriggerRun={vm.triggerRun}
                  isTriggering={vm.isTriggeringRun}
                />
              )}
            </section>

            {/* Private grades & feedback */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                Grades &amp; feedback
                <span className="ml-2 align-middle text-xs font-normal text-[var(--text-muted)]">
                  (private to you)
                </span>
              </h2>
              <StudentGradesCard repo={d.repo} assignment={d.assignment} />
            </section>
          </>
        )}
      </StateBoundary>
    </div>
  );
}
