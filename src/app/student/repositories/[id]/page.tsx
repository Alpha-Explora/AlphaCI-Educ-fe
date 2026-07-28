"use client";
// ============================================================================
// VIEW LAYER — Active workspace (student)
// Branch toggle, Get Lab Token, Submit for grading, CI/CD error logs (per-stage
// checks with human-readable hints; hidden tests masked), and a private Grades
// & Feedback area. Consumes useRepositoryDetail + useGrading (submit only).
//
// TABBED because the page had grown to four full-height sections stacked in one
// column — the actions a student needs constantly (open in VS Code, submit) sat
// above three long read-only panels, so every visit to check a failing test
// meant scrolling past them, and every submit meant scrolling back. The four
// panels are also used at different moments, not together: you work, then you
// look at what CI said, then much later you read a grade.
//
// The header, the status pills and the closed-project banner stay OUTSIDE the
// tabs: they describe the repository itself, and a student who cannot submit
// because the teacher ended the project must see that on every tab, not just
// the one holding the disabled button.
// ============================================================================
import { useState } from "react";
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
  Tabs,
  type TabItem,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { RepoRunsExplorer } from "@/components/domain/RepoRunsExplorer";
import { LabTokenPanel } from "@/components/domain/LabTokenPanel";
import { StartAssignmentPanel } from "@/components/domain/StartAssignmentPanel";
import { GithubActivityPanel } from "@/components/domain/GithubActivityPanel";
import { StudentGradesCard } from "@/components/domain/StudentGradesCard";
import { relativeDue } from "@/components/ui/format";

/**
 * Split by MOMENT, not by data source.
 *
 * "Work" is everything you touch while doing the assignment; the other three
 * are things you consult afterwards, in roughly this order — what did I push,
 * what did the tests say, what did I score. Activity and Test results stay
 * apart despite both being about CI: Activity is live GitHub truth (commits,
 * branches, workflow runs) and Test results is this platform's per-stage
 * breakdown with debugging hints. Merging them would rebuild the tall page
 * this split exists to break up.
 */
type WorkspaceTab = "work" | "activity" | "results" | "grades";

const TABS: ReadonlyArray<TabItem<WorkspaceTab>> = [
  { id: "work", label: "Work" },
  { id: "activity", label: "Activity" },
  { id: "results", label: "Test results" },
  { id: "grades", label: "Grades" },
];

export default function StudentWorkspacePage() {
  const params = useParams<{ id: string }>();
  const repoId = params?.id ?? null;
  const vm = useRepositoryDetail(repoId);
  const d = vm.data;
  // Component state rather than the URL, matching the teacher class page. The
  // tab is a reading position, not a destination worth sharing.
  const [tab, setTab] = useState<WorkspaceTab>("work");

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
              // No external repository link. Students reach their code through
              // the system only — the Start/Open-in-VS-Code panel on the Work
              // tab is the single sanctioned route to the source.
            />

            {/* Outside the tabs on purpose: losing access applies to every panel,
                so it must not be hidden behind the one a student is not on. */}
            {closed && (
              <Banner tone="warning" title="Project closed">
                Your teacher has ended this project. You can no longer open it in VS
                Code, get a lab token, or submit. Your work and grades stay available
                under Test results and Grades.
              </Banner>
            )}

            {/* Tab strip and its panel are one unit, spaced closer together
                than the page's 2rem rhythm — a panel floating that far from the
                strip stops reading as belonging to it. */}
            <div className="space-y-6">
              <Tabs
                items={TABS}
                value={tab}
                onChange={setTab}
                label="Workspace sections"
                idPrefix="workspace"
              />

              {tab === "work" && (
                <div
                  id="workspace-panel-work"
                  role="tabpanel"
                  aria-labelledby="workspace-tab-work"
                  className="space-y-5"
                >
                  {/* Assignment brief — first thing on the tab you work from,
                      because it is what you are being asked to build. */}
                  <Card className="p-5">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Brief
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-strong)]">
                      {d.assignment.description}
                    </p>
                  </Card>

                  {/* Actions: start-in-VS-Code (with manual lab-token fallback) +
                      submit. Hidden once the teacher closes the project. */}
                  {!closed && (
                    // items-start, so the submit card is only as tall as its own
                    // content. Stretching it to match the two stacked cards beside
                    // it left a large empty panel with a button marooned at the
                    // bottom — the gap read as something failing to load.
                    <div className="grid items-start gap-5 lg:grid-cols-2">
                      <div className="space-y-5">
                        <StartAssignmentPanel repoId={d.repo.id} />
                        <LabTokenPanel
                          token={vm.labToken}
                          onRequest={vm.requestLabToken}
                          isLoading={vm.isRequestingToken}
                          error={vm.labTokenError}
                        />
                      </div>

                      <Card className="p-5">
                        <h2 className="text-base font-semibold text-[var(--text-strong)]">
                          Submit for grading
                        </h2>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          Lock in your current work on{" "}
                          <strong>{vm.selectedBranch ?? "main"}</strong> and send it to your
                          teacher for review.
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

                        <div className="mt-4">
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
                </div>
              )}

              {/* ADDENDUM M — real commits / branches / CI runs from GitHub.
                  Only mounted while selected, which also stops its polling when a
                  student is reading something else. */}
              {tab === "activity" && (
                <div
                  id="workspace-panel-activity"
                  role="tabpanel"
                  aria-labelledby="workspace-tab-activity"
                >
                  <GithubActivityPanel repoId={d.repo.id} />
                </div>
              )}

              {tab === "results" && (
                <section
                  id="workspace-panel-results"
                  role="tabpanel"
                  aria-labelledby="workspace-tab-results"
                  className="space-y-4"
                >
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
              )}

              {tab === "grades" && (
                <section
                  id="workspace-panel-grades"
                  role="tabpanel"
                  aria-labelledby="workspace-tab-grades"
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                    Grades &amp; feedback
                    <span className="ml-2 align-middle text-xs font-normal text-[var(--text-muted)]">
                      (private to you)
                    </span>
                  </h2>
                  <StudentGradesCard repo={d.repo} assignment={d.assignment} />
                </section>
              )}
            </div>
          </>
        )}
      </StateBoundary>
    </div>
  );
}
