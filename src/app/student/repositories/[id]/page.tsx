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
// TAB STRIP AT THE TOP, THEN ONE CONTAINER holding the workspace header and
// whichever tab is open. The header used to be page furniture above the strip,
// which spent the top third of the screen on the repository's name and pushed
// the six things a student came to do below the fold of a lab monitor.
//
// The header, the status pills and the closed-project banner still sit outside
// any single tab — they describe the repository itself, and a student who cannot
// submit because the teacher ended the project must see that on every tab, not
// just the one holding the disabled button. They now say so from inside the
// container the tabs feed, rather than from above it.
//
// Because the page owns that container, the panels inside it must not draw their
// own: each is handed `surface={false}` (see PanelSurface). The teacher workspace
// shares these panels and keeps its own layout, which is why the flag is a prop
// with a card-drawing default rather than a change to the panels themselves.
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

/**
 * A block inside the page's one card.
 *
 * Bordered but NOT raised. A card's shadow says "this floats above the page",
 * which is a lie one padding-width inside another card — nested shadows are how
 * a layout starts looking like a stack of receipts. The border on its own is
 * enough to stop two side-by-side actions reading as one column of prose.
 */
const SUB_PANEL = "rounded-lg border border-[var(--border-subtle)] p-4";

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
            {/*
              TABS FIRST, AT THE TOP OF THE PAGE.

              They are the highest-level control here — which of six views of this
              repository you are looking at — and they used to sit below a header
              band that pushed them a third of the way down the screen. On a lab
              PC that meant the six things a student is here to do were below the
              fold of the first thing they saw.
            */}
            <Tabs
              items={TABS}
              value={tab}
              onChange={setTab}
              label="Workspace sections"
              idPrefix="workspace"
            />

            {/*
              ONE CONTAINER for the workspace header and whichever tab is open.

              The header names the thing every tab is a view OF, so it belongs
              with them rather than floating above the tab strip as page
              furniture. Everything inside is a section of this card, which is why
              the panels are handed `surface={false}` — see PanelSurface. A panel
              that still drew its own card would put a second border and shadow
              one padding-width inside this one.
            */}
            <Card className="p-5">
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

              {/* Under the header and above the rule, so it reads as a fact about
                  the repository just named — and so it is on screen whichever tab
                  is open. Losing access applies to every panel and must not be
                  hidden behind the one a student is not looking at. */}
              {closed && (
                <Banner tone="warning" title="Project closed" className="mt-4">
                  Your teacher has ended this project. You can no longer open it in VS
                  Code, merge a pull request, or submit. Your work and grades stay
                  available under Code, Actions, Test results and Grades.
                </Banner>
              )}

              {/* The rule is what separates "which repository" from "what you are
                  doing to it". Without it the open tab reads as more header. */}
              <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">

              {tab === "work" && (
                <div
                  id="workspace-panel-work"
                  role="tabpanel"
                  aria-labelledby="workspace-tab-work"
                  className="space-y-5"
                >
                  {/* Assignment brief — first thing on the tab you work from,
                      because it is what you are being asked to build. Unboxed:
                      it is the opening paragraph of this tab, and inside the
                      page's card a border around prose reads as a callout the
                      brief is not. */}
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Brief
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-strong)]">
                      {d.assignment.description}
                    </p>
                  </div>

                  {/* Actions: start-in-VS-Code + submit. Hidden once the teacher
                      closes the project.

                      The manual "Lab access token" card used to sit under the
                      start panel as a fallback. It is gone: it rendered a live
                      `ghs_` push credential on a shared lab screen, copied it to
                      the clipboard, and asked a student to paste it into a shell
                      to do what the extension does invisibly. A fallback that
                      hands out a worse credential than the primary path is not a
                      safety net. What replaced it is the start panel naming who
                      can fix each failure, since there is nothing left to fall
                      back TO. */}
                  {!closed && (
                    // items-start, so the submit card is only as tall as its own
                    // content. Stretching it to match the card beside it left a
                    // large empty panel with a button marooned at the bottom —
                    // the gap read as something failing to load.
                    <div className="grid items-start gap-5 lg:grid-cols-2">
                      <div className={SUB_PANEL}>
                        <StartAssignmentPanel repoId={d.repo.id} surface={false} />
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
                      <div className={SUB_PANEL}>
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
                      </div>
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
                    surface={false}
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
                      surface={false}
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
                  <GithubActionsPanel repoId={d.repo.id} surface={false} />
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
                      runsOnOtherBranches={vm.runsOnOtherBranches}
                      audience="student"
                      onTriggerRun={vm.triggerRun}
                      isTriggering={vm.isTriggeringRun}
                      maxPoints={pointsPerRepo(d.assignment)}
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
                  <StudentGradesCard repo={d.repo} assignment={d.assignment} surface={false} />
                </section>
              )}
              </div>
            </Card>
          </>
        )}
      </StateBoundary>
    </div>
  );
}
