"use client";
// ============================================================================
// VIEW LAYER — Repository / grading view (teacher)
// Assignment info, owner + collaborators, branches, pipeline runs with the
// 5-stage breakdown (hidden tests revealed), plagiarism flag, and the grading
// panel. Consumes useRepositoryDetail; grading via useGrading (inside panel).
//
// SECTIONED, like the class page, and for the same reason. This was one scroll
// carrying four unrelated jobs — read the brief, read the pipeline, merge the
// pull request, record a mark — and the one a teacher opens the page to do,
// marking, was at the bottom of all of it, past a run list that expands. The
// rail is the same SideTabs component the class roster uses, so a teacher who
// learns the pattern in one place already knows it here.
// ============================================================================
import { useState } from "react";
import { useParams } from "next/navigation";
import { useRepositoryDetail } from "@/viewmodels/useRepositoryDetail";
import { useClassRoster } from "@/viewmodels/useClassRoster";
import {
  Avatar,
  Banner,
  Button,
  Card,
  GenericPill,
  RepoStatusPill,
  SideTabs,
  Skeleton,
  Stat,
  StateBoundary,
  type SideTabGroup,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { RepoRunsExplorer } from "@/components/domain/RepoRunsExplorer";
import { SubmitForReviewPanel } from "@/components/domain/SubmitForReviewPanel";
import { GradingPanel } from "@/components/domain/GradingPanel";
import { AnswerKeyPanel } from "@/components/domain/AnswerKeyPanel";
import { PlagiarismCard } from "@/components/domain/PlagiarismCard";
import { GithubActionsPanel } from "@/components/domain/GithubActionsPanel";
import { formatDate, formatDateTime, relativeDue } from "@/components/ui/format";
import { pointsPerRepo } from "@/models/points";

type RepoTab = "overview" | "actions" | "results" | "review" | "grading";

// Grouped the way the class rail is: the headings name what this repository
// HAS, so the list reads as a map rather than as five buttons.
//
// ACTIONS AND TEST RESULTS ARE SEPARATE, as they are in the student workspace,
// and for the reason stated there: they are two different truths about the same
// push. Actions is GITHUB's — which run, which job, which step, and what the
// runner printed. Test results is ALPHACI's — the per-stage grading breakdown
// and the mark it produced. They agree most of the time, and the times they do
// not are exactly the times a teacher is on this page: a run green on GitHub
// whose report never reached this server reads as "passed" in one and "no result"
// in the other, and that gap IS the diagnosis. Stacked in one tab they looked
// like one long story about a single system.
//
// The labels are the student's, deliberately. A teacher fielding "my pipeline
// failed" is looking at the same evidence under the same name, so neither has to
// translate. It also keeps the vocabulary GitHub's own, which is the one both
// will meet again outside this product.
const TAB_GROUPS: ReadonlyArray<SideTabGroup<RepoTab>> = [
  { heading: "Submission", items: [{ id: "overview", label: "Overview" }] },
  {
    heading: "Pipeline",
    items: [
      { id: "actions", label: "Actions" },
      { id: "results", label: "Test results" },
    ],
  },
  { heading: "Review", items: [{ id: "review", label: "Pull request" }] },
  { heading: "Marking", items: [{ id: "grading", label: "Grade & feedback" }] },
];

export default function TeacherRepositoryPage() {
  const params = useParams<{ id: string }>();
  const repoId = params?.id ?? null;
  const vm = useRepositoryDetail(repoId);
  const d = vm.data;
  // Marking is the job. Overview opens because you read the brief and who wrote
  // it before you judge the work, and it is one click from here to the mark.
  const [tab, setTab] = useState<RepoTab>("overview");

  // Only for naming the way back. Almost always a cache hit — the teacher
  // arrived from this class's roster — and the label degrades to "Class" while
  // it is not, rather than blocking anything on it.
  const roster = useClassRoster(d?.assignment.classId ?? null);
  const classInfo = roster.data?.classInfo;

  return (
    <div className="space-y-8">
      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        loadingFallback={
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        {d && (
          <>
            <PageHeader
              // Teacher area: title at the right of the band. See PageHeader's titleAlign.
              titleAlign="end"
              // Back to the class this work belongs to, not the dashboard. A
              // teacher reaches this page by opening one student's project from
              // a roster they are working down, and sending them to the
              // dashboard made them navigate back in three clicks to reach the
              // next student.
              backHref={`/teacher/classes/${d.assignment.classId}`}
              backLabel={
                classInfo ? `${classInfo.code} — ${classInfo.name}` : "Class"
              }
              title={d.assignment.title}
              subtitle={
                <span className="font-mono text-xs">{d.repo.repoName}</span>
              }
              meta={
                <>
                  <RepoStatusPill status={d.repo.status} />
                  {d.assignment.isGroup && <GenericPill tone="info">Group project</GenericPill>}
                  <GenericPill>{d.assignment.points} pts</GenericPill>
                  {/* Guarded: relativeDue returns "" with no deadline, and an
                      empty pill is a coloured blob with nothing in it. */}
                  {d.assignment.dueDate && (
                    <GenericPill tone="warning">{relativeDue(d.assignment.dueDate)}</GenericPill>
                  )}
                </>
              }
              // No external repository link — grading happens against the
              // pipeline results below, inside the system.
            />

            {/* Rail + the open section. items-start, or the filled rail is
                drawn as tall as whichever tab happens to be open — see the
                class page, which had exactly that bug. */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
              <SideTabs
                groups={TAB_GROUPS}
                value={tab}
                onChange={setTab}
                label="Repository sections"
                idPrefix="repo"
              />

              {/* min-w-0 or the run list's own wide rows push this column past
                  the viewport instead of scrolling inside themselves. */}
              <div className="min-w-0 flex-1 space-y-8">
                {tab === "overview" && (
                  <div
                    id="repo-panel-overview"
                    role="tabpanel"
                    aria-labelledby="repo-tab-overview"
                    className="space-y-8"
                  >
                    {/* Assignment + people + submission meta */}
                    <div className="grid gap-5 lg:grid-cols-3">
                      <Card className="p-5 lg:col-span-2">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Assignment
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--text-strong)]">
                          {d.assignment.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-6 border-t border-[var(--border-subtle)] pt-4 text-sm">
                          <div>
                            <p className="text-xs text-[var(--text-muted)]">Due</p>
                            <p className="font-medium">
                              {d.assignment.dueDate ? formatDate(d.assignment.dueDate) : "No deadline"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted)]">Submitted</p>
                            <p className="font-medium">{formatDateTime(d.repo.submittedAt)}</p>
                          </div>
                          {/* Only when one was actually recorded. This used to render
                              unconditionally, and since the field defaults to an empty
                              string every project without one showed a "Repository
                              template" link whose empty href just reloaded this page. */}
                          {d.assignment.templateGithubUrl && (
                            <div>
                              <p className="text-xs text-[var(--text-muted)]">Template</p>
                              <a
                                href={d.assignment.templateGithubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-platform hover:underline"
                              >
                                Repository template
                              </a>
                            </div>
                          )}
                        </div>
                      </Card>

                      <Card className="p-5">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          {d.assignment.isGroup ? "Team" : "Student"}
                        </h2>
                        <div className="mt-3 space-y-3">
                          {d.owner && (
                            <div className="flex items-center gap-3">
                              <Avatar name={d.owner.fullName} color={d.owner.avatarColor} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                                  {d.owner.fullName}
                                </p>
                                <p className="truncate text-xs text-[var(--text-muted)]">
                                  {d.owner.email}
                                </p>
                              </div>
                            </div>
                          )}
                          {d.collaborators
                            .filter((c) => c.id !== d.owner?.id)
                            .map((c) => (
                              <div key={c.id} className="flex items-center gap-3">
                                <Avatar name={c.fullName} color={c.avatarColor} size="sm" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                                    {c.fullName}
                                  </p>
                                  <p className="truncate text-xs text-[var(--text-muted)]">
                                    Collaborator
                                  </p>
                                </div>
                              </div>
                            ))}
                          {!d.owner && d.collaborators.length === 0 && (
                            <p className="text-sm text-[var(--text-muted)]">No assignees.</p>
                          )}
                        </div>
                      </Card>
                    </div>

                    {/* Originality sits with the submission, not with the
                        pipeline: it describes the work that was handed in, and
                        it is one of the things a teacher checks before reading
                        a line of it. */}
                    <PlagiarismCard flags={d.plagiarism} />
                  </div>
                )}

                {tab === "actions" && (
                  <div
                    id="repo-panel-actions"
                    role="tabpanel"
                    aria-labelledby="repo-tab-actions"
                  >
                    {/* ADDENDUM M — real GitHub Actions runs, one container per commit.
                        Same panel the student sees, so a teacher debugging "my pipeline
                        failed" is looking at the identical evidence they are. */}
                    <GithubActionsPanel repoId={d.repo.id} />
                  </div>
                )}

                {tab === "results" && (
                  <div
                    id="repo-panel-results"
                    role="tabpanel"
                    aria-labelledby="repo-tab-results"
                    className="space-y-8"
                  >
                    {/* Runs + the stage breakdown */}
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                        CI/CD pipeline
                      </h2>
                      {/*
                        Surfaced here rather than only in the server log, because the
                        consequence is invisible otherwise: the pipeline still runs and
                        still reports a mark, it just cannot measure code quality. Left
                        unsaid, a teacher would discover it at the end of term.
                      */}
                      {d.repo.sonarError && (
                        <Banner tone="warning">
                          SonarCloud is not wired up for this repository, so code quality
                          cannot be graded ({d.repo.sonarError}). Re-provision the
                          repository to write its Sonar secrets again.
                        </Banner>
                      )}
                      {d.runs.length === 0 ? (
                        /*
                          THE DIAGNOSTIC MOMENT, and the reason the two tabs are
                          worth separating. "No results here" and "nothing ever
                          ran" look identical from this page, and they are
                          different faults with different owners: a pipeline that
                          has not run is the student's, a pipeline that ran and
                          could not report is the school's (see
                          docs/PIPELINE_REPORTING.md — almost always
                          ALPHACI_API_BASE_URL). Actions is the one place that
                          tells them apart, so the empty state sends them there
                          rather than leaving a flat statement of absence.
                        */
                        <Banner tone="info">
                          <p>AlphaCI holds no pipeline result for this repository.</p>
                          <p className="mt-1">
                            Check <strong>Actions</strong> first — if runs are listed there,
                            they finished on GitHub but their report is not reaching this
                            server, which is a configuration problem rather than anything
                            the student can fix.
                          </p>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-3"
                            onClick={() => setTab("actions")}
                          >
                            Open Actions
                          </Button>
                        </Banner>
                      ) : (
                        <RepoRunsExplorer
                          branches={d.branches}
                          selectedBranch={vm.selectedBranch}
                          onSelectBranch={vm.selectBranch}
                          runs={vm.runsForBranch}
                          runsOnOtherBranches={vm.runsOnOtherBranches}
                          audience="teacher"
                          onTriggerRun={vm.triggerRun}
                          isTriggering={vm.isTriggeringRun}
                          sonarDashboardUrl={d.repo.sonarDashboardUrl}
                          // This repository's share, not the project total — the
                          // same denominator the grading panel enforces.
                          maxPoints={pointsPerRepo(d.assignment)}
                        />
                      )}
                    </section>
                  </div>
                )}

                {tab === "review" && (
                  <div
                    id="repo-panel-review"
                    role="tabpanel"
                    aria-labelledby="repo-tab-review"
                    className="space-y-8"
                  >
                    {/*
                      Teachers see the same panel as students, with one addition: when
                      a pipeline has failed, the override control appears. That is the
                      escape hatch for a broken hidden test or a Sonar outage near a
                      deadline, and it is recorded against the teacher who used it.

                      Its own section rather than a tail on the pipeline one: merging a
                      student's pull request is a decision with a consequence, and it
                      was reached by scrolling past a run list that expands.
                    */}
                    <SubmitForReviewPanel
                      repoId={d.repo.id}
                      branches={d.branches}
                      audience="teacher"
                      isGroup={Boolean(d.assignment.isGroup)}
                    />
                  </div>
                )}

                {tab === "grading" && (
                  <div
                    id="repo-panel-grading"
                    role="tabpanel"
                    aria-labelledby="repo-tab-grading"
                    className="space-y-8"
                  >

                    {/* Grading.

                        Two equal columns — what is on record, and the form that changes
                        it — then the answer key across the full width beneath them.

                        It was a 1fr + 360px grid with the record card in the left track
                        and BOTH panels stacked in the right. The record card only
                        renders once a grade exists, so every ungraded repository (which
                        is every repository a teacher actually opens to mark) drew a
                        tall narrow rail against two thirds of empty page. A declared
                        grid track does not collapse when its child renders nothing.

                        So the left card now always renders, and says "not graded yet"
                        when that is the answer — which is information, and is the
                        question the teacher came here to settle. The answer key moved
                        out to full width because it prints source files, and 360px is
                        not a column to read code in. */}
                    <section className="space-y-5">
                      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                        <Card className="order-2 p-5 lg:order-1">
                          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            On record
                          </h2>
                          <div className="mt-3 flex flex-wrap items-start gap-x-10 gap-y-4">
                            <Stat
                              label="Recorded grade"
                              value={
                                d.repo.grade !== null
                                  ? `${d.repo.grade}/${pointsPerRepo(d.assignment)}`
                                  : "—"
                              }
                              tone={d.repo.grade !== null ? "success" : "default"}
                              hint={
                                d.repo.grade !== null
                                  ? `Marked ${formatDateTime(d.repo.gradedAt)}`
                                  : "Not graded yet"
                              }
                            />
                            <Stat
                              label="Latest CI score"
                              // Out of the same denominator as the recorded grade
                              // beside it. It was rendered as a bare percentage
                              // while `score` is a POINT total — so on these SPLIT
                              // projects, where each half is marked out of 50, a
                              // run scoring 35 of 50 read as "35%" against a
                              // recorded grade of "35/50". Two scales, one row.
                              value={
                                vm.latestRun && vm.latestRun.score !== null
                                  ? `${vm.latestRun.score}/${pointsPerRepo(d.assignment)}`
                                  : "—"
                              }
                              tone={
                                vm.latestRun && vm.latestRun.score !== null
                                  ? "platform"
                                  : "default"
                              }
                              // The pipeline's number is evidence, not the mark. Said
                              // here because the two sit side by side and a teacher in
                              // a hurry could read the CI score as already applied.
                              hint={
                                vm.latestRun && vm.latestRun.score !== null
                                  ? "The pipeline's own score. Not applied automatically."
                                  : "No pipeline result yet"
                              }
                            />
                          </div>

                          {d.repo.teacherFeedback ? (
                            <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                Feedback on record
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-strong)]">
                                {d.repo.teacherFeedback}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-muted)]">
                              No feedback saved for this student yet. Whatever you write
                              beside this replaces what is shown here.
                            </p>
                          )}
                        </Card>

                        <div className="order-1 lg:order-2">
                          {/* This repository's share, not the project's total.
                              With the project total the input accepted 100 for a
                              half worth 50 and the server rejected the save —
                              a validation error the teacher could not act on,
                              because nothing on screen said 50 was the limit. */}
                          <GradingPanel
                            repo={d.repo}
                            maxPoints={pointsPerRepo(d.assignment)}
                            // The same run the "Latest CI score" stat beside this
                            // reads, so the number the button applies is the number
                            // on screen — one source, not two that can disagree.
                            pipelineRun={vm.latestRun}
                          />
                        </div>
                      </div>

                      {/* Beneath the grading form, not above it: the mark is
                          the job on this page, and the reference is what you
                          reach for when the student's approach is unfamiliar.
                          Collapsed by default — see AnswerKeyPanel for why that
                          is deliberate. */}
                      <AnswerKeyPanel assignmentId={d.assignment.id} />
                    </section>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </StateBoundary>
    </div>
  );
}
