"use client";
// ============================================================================
// VIEW LAYER — Repository / grading view (teacher)
// Assignment info, owner + collaborators, branches, pipeline runs with the
// 5-stage breakdown (hidden tests revealed), plagiarism flag, and the grading
// panel. Consumes useRepositoryDetail; grading via useGrading (inside panel).
// ============================================================================
import { useParams } from "next/navigation";
import { useRepositoryDetail } from "@/viewmodels/useRepositoryDetail";
import {
  Avatar,
  Banner,
  Card,
  GenericPill,
  RepoStatusPill,
  Skeleton,
  Stat,
  StateBoundary,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { RepoRunsExplorer } from "@/components/domain/RepoRunsExplorer";
import { SubmitForReviewPanel } from "@/components/domain/SubmitForReviewPanel";
import { GradingPanel } from "@/components/domain/GradingPanel";
import { PlagiarismCard } from "@/components/domain/PlagiarismCard";
import { GithubActionsPanel } from "@/components/domain/GithubActionsPanel";
import { formatDate, formatDateTime, relativeDue } from "@/components/ui/format";

export default function TeacherRepositoryPage() {
  const params = useParams<{ id: string }>();
  const repoId = params?.id ?? null;
  const vm = useRepositoryDetail(repoId);
  const d = vm.data;

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
              backHref={
                d.owner ? `/teacher` : `/teacher`
              }
              backLabel="Dashboard"
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

            {/* ADDENDUM M — real GitHub Actions runs, one container per commit.
                Same panel the student sees, so a teacher debugging "my pipeline
                failed" is looking at the identical evidence they are. */}
            <GithubActionsPanel repoId={d.repo.id} />

            {/* Plagiarism */}
            <PlagiarismCard flags={d.plagiarism} />

            {/* Runs + 5-stage breakdown */}
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
                <Banner tone="info">No pipeline runs recorded for this repository.</Banner>
              ) : (
                <RepoRunsExplorer
                  branches={d.branches}
                  selectedBranch={vm.selectedBranch}
                  onSelectBranch={vm.selectBranch}
                  runs={vm.runsForBranch}
                  audience="teacher"
                  onTriggerRun={vm.triggerRun}
                  isTriggering={vm.isTriggeringRun}
                  sonarDashboardUrl={d.repo.sonarDashboardUrl}
                />
              )}

              {/*
                Teachers see the same panel as students, with one addition: when
                a pipeline has failed, the override control appears. That is the
                escape hatch for a broken hidden test or a Sonar outage near a
                deadline, and it is recorded against the teacher who used it.
              */}
              <SubmitForReviewPanel
                repoId={d.repo.id}
                branches={d.branches}
                audience="teacher"
                isGroup={Boolean(d.assignment.isGroup)}
              />
            </section>

            {/* Grading */}
            <section className="grid gap-5 lg:grid-cols-[1fr_minmax(0,360px)]">
              <div className="order-2 lg:order-1">
                {d.repo.grade !== null && (
                  <Card className="p-5">
                    <div className="flex items-center gap-6">
                      <Stat
                        label="Recorded grade"
                        value={`${d.repo.grade}/${d.assignment.points}`}
                        tone="success"
                      />
                      {vm.latestRun?.score !== null && vm.latestRun && (
                        <Stat
                          label="Latest CI score"
                          value={`${vm.latestRun.score}%`}
                          tone="platform"
                        />
                      )}
                    </div>
                    {d.repo.teacherFeedback && (
                      <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Feedback on record
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-strong)]">
                          {d.repo.teacherFeedback}
                        </p>
                      </div>
                    )}
                  </Card>
                )}
              </div>
              <div className="order-1 lg:order-2">
                <GradingPanel repo={d.repo} maxPoints={d.assignment.points} />
              </div>
            </section>
          </>
        )}
      </StateBoundary>
    </div>
  );
}
