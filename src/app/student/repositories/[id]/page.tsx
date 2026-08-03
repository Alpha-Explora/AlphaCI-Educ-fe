"use client";
// ============================================================================
// VIEW LAYER — Active workspace (student)
// Open in VS Code, Get Lab Token, hand in, code browser, pull requests, GitHub
// Actions runs, CI/CD error logs (per-stage checks with human-readable hints;
// hidden tests masked), and a private Grades & Feedback area. Consumes
// useRepositoryDetail + useGrading (submit only).
//
// TABBED because the page had grown to four full-height sections stacked in one
// column — the actions a student needs constantly (open in VS Code, submit) sat
// above three long read-only panels, so every visit to check a failing test
// meant scrolling past them, and every submit meant scrolling back. The panels
// are also used at different moments, not together: you work, you propose the
// merge, you watch it run, then much later you read a grade.
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
import { SubmitForReviewPanel } from "@/components/domain/SubmitForReviewPanel";
import { CodeBrowserPanel } from "@/components/domain/CodeBrowserPanel";
import { LabTokenPanel } from "@/components/domain/LabTokenPanel";
import { StartAssignmentPanel } from "@/components/domain/StartAssignmentPanel";
import { GithubActionsPanel } from "@/components/domain/GithubActionsPanel";
import { StudentGradesCard } from "@/components/domain/StudentGradesCard";
import { relativeDue } from "@/components/ui/format";
import { pointsPerRepo } from "@/models/points";

/**
 * Split by MOMENT, not by data source.
 *
 * "Work" is everything you touch while doing the assignment; the rest are
 * things you consult afterwards, in roughly this order — what did I submit,
 * what ran on it, what did the tests say, what did I score.
 *
 * The names are GitHub's on purpose. A student who learns "Code / Pull
 * requests / Actions" here reads a real repository on the first attempt; one
 * who learns our private vocabulary has to learn it twice. Pull requests and
 * Actions were previously called neither of those things — the merge flow was
 * buried at the bottom of Work, and the run history was "Activity".
 *
 * Actions and Test results stay apart despite both being about CI: Actions is
 * GitHub's own truth (which run, which job, which step) and Test results is
 * this platform's per-stage grading breakdown. Merging them would rebuild the
 * tall page this split exists to break up.
 */
type WorkspaceTab = "work" | "code" | "pulls" | "actions" | "results" | "grades";

const TABS: ReadonlyArray<TabItem<WorkspaceTab>> = [
  { id: "work", label: "Work" },
  // Directly after Work: reading your own code is part of doing the assignment,
  // not an afterthought — and students have no GitHub account to read it on.
  { id: "code", label: "Code" },
  // Then the order the work actually moves in: propose it, watch it run, read
  // what the tests said, read the mark.
  { id: "pulls", label: "Pull requests" },
  { id: "actions", label: "Actions" },
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
    // This repository's share of the project, so a SPLIT half is bounded by
    // what it is actually worth. See models/points.ts.
    maxPoints: d ? pointsPerRepo(d.assignment) : 100,
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
              // Back to the CLASS this project belongs to, not past it to the
              // course list. There is a level between them now (Courses -> class
              // -> workspace), and a back link that skips one leaves a student
              // re-finding their class every time they close a project.
              backHref={`/student/classes/${d.assignment.classId}`}
              backLabel="Back to class"
              title={d.assignment.title}
              subtitle={<span className="font-mono text-xs">{d.repo.repoName}</span>}
              meta={
                <>
                  <RepoStatusPill status={d.repo.status} />
                  {d.assignment.isGroup && (
                    <GenericPill tone="info">Group project</GenericPill>
                  )}
                  <GenericPill>{d.assignment.points} pts</GenericPill>
                  {/* Guarded: relativeDue returns "" with no deadline, and an
                      empty pill is a coloured blob with nothing in it. */}
                  {d.assignment.dueDate && (
                    <GenericPill tone="warning">{relativeDue(d.assignment.dueDate)}</GenericPill>
                  )}
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
                Code, get a lab token, merge a pull request, or submit. Your work and
                grades stay available under Code, Actions, Test results and Grades.
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

                      {/*
                        Deliberately reworded to stop this being confused with
                        "Submit for review" below, which is the git operation.
                        This button performs NO git action at all — it sets
                        repo.status = SUBMITTED, a declaration that you are done.
                        The previous copy said "your current work on {branch}",
                        which was doubly misleading: the selected branch is only a
                        run filter, and students cannot push to main in the first
                        place, so the state it described was unreachable.
                      */}
                      <Card className="p-5">
                        <h2 className="text-base font-semibold text-[var(--text-strong)]">
                          Tell your teacher you&apos;re finished
                        </h2>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          This is the last step, and it changes no code. Merge your
                          work into <strong>main</strong> first, on the{" "}
                          <strong>Pull requests</strong> tab — whatever is on{" "}
                          <strong>main</strong> is what gets graded.
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
                              <span aria-hidden="true">📤</span> Mark as finished
                            </Button>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}

                </div>
              )}

              {/* Reading the code. Mounted only while selected so its per-path
                  GitHub reads stop when the student moves to another tab. */}
              {tab === "code" && (
                <section
                  id="workspace-panel-code"
                  role="tabpanel"
                  aria-labelledby="workspace-tab-code"
                >
                  <CodeBrowserPanel
                    repoId={d.repo.id}
                    branches={d.branches}
                    defaultBranch={vm.selectedBranch}
                  />
                </section>
              )}

              {/*
                Pull requests — its own tab, because this is a destination, not
                a step inside "Work". It is the ONLY route from a pushed branch
                into main: `git push origin main` is rejected by branch
                protection, and students have no GitHub account to open a pull
                request with. Sitting at the bottom of Work it read as an
                optional extra below the submit button, which is precisely
                backwards — nothing can be graded until it has been used.

                Still hidden once the teacher closes the project: there is
                nothing left to merge into, and offering the form would only
                produce a refusal from the server.
              */}
              {tab === "pulls" && (
                <section
                  id="workspace-panel-pulls"
                  role="tabpanel"
                  aria-labelledby="workspace-tab-pulls"
                  className="space-y-4"
                >
                  {closed ? (
                    <Banner tone="info">
                      This project is closed, so no new work can be merged. Your
                      previous submissions are still under Test results and Grades.
                    </Banner>
                  ) : (
                    // Branches come from live GitHub via getDetail, which is what
                    // makes the branch picker non-empty on a real repository.
                    <SubmitForReviewPanel
                      repoId={d.repo.id}
                      branches={d.branches}
                      audience="student"
                      isGroup={Boolean(d.assignment.isGroup)}
                    />
                  )}
                </section>
              )}

              {/* ADDENDUM M — real GitHub Actions runs, one container per commit.
                  Only mounted while selected, which also stops its polling when a
                  student is reading something else. */}
              {tab === "actions" && (
                <div
                  id="workspace-panel-actions"
                  role="tabpanel"
                  aria-labelledby="workspace-tab-actions"
                >
                  <GithubActionsPanel repoId={d.repo.id} />
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
