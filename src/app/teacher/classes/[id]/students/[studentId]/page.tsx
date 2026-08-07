"use client";
// ============================================================================
// VIEW LAYER — one student, within one class (teacher).
//
// The destination a name on the roster now leads to. Before this, a student was
// a row of counters — "3 submitted · 1 marked · 62%" — and the only way to reach
// their actual work was to go project by project through the Assignments tab and
// find their name in each submission list. For a teacher following up with one
// person, that is the wrong axis entirely: they hold a student in mind, not a
// project.
//
// SCOPED TO THIS CLASS, deliberately. The endpoint returns the student's work
// across every class they are enrolled in, and this page filters to the one in
// the URL. A teacher who shares a student with another section has no business
// reading that section's marks from here, and a page that silently widened its
// scope would be the kind of thing nobody notices until it matters.
//
// ONE REQUEST, not one per project. Building this from the per-assignment
// repository lists would issue a query per project in the class — the exact
// request storm the Assignments list was restructured to remove. The student
// dashboard already returns every repository with its latest run attached.
// ============================================================================
import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useClassRoster } from "@/viewmodels/useClassRoster";
import { useStudentDashboard } from "@/viewmodels/useStudentDashboard";
import {
  Avatar,
  Card,
  EmptyState,
  GenericPill,
  PipelineStatusPill,
  ProgressBar,
  RepoStatusPill,
  Skeleton,
  Stat,
  StateBoundary,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { formatDate, relativeDue } from "@/components/ui/format";
import { pointsPerRepo } from "@/models/points";

function gradeTone(avg: number): "success" | "platform" | "warning" {
  if (avg >= 80) return "success";
  if (avg >= 60) return "platform";
  return "warning";
}

export default function TeacherStudentPage() {
  const params = useParams<{ id: string; studentId: string }>();
  const classId = params?.id ?? null;
  const studentId = params?.studentId ?? null;

  const backHref = `/teacher/classes/${classId}?tab=students`;

  const roster = useClassRoster(classId);
  const board = useStudentDashboard(studentId);

  const info = roster.data?.classInfo;
  // The roster's row, for the counters and the average. Computed by the server
  // over this class only, which is the same scope this page shows — so the
  // header and the list below it cannot disagree.
  const student = roster.data?.students.find((s) => s.id === studentId) ?? null;

  // THIS class's projects only. `classId` rides every row in the payload for
  // exactly this filter.
  const rows = useMemo(
    () => (board.data?.assignments ?? []).filter((row) => row.classId === classId),
    [board.data, classId],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        titleAlign="end"
        backHref={backHref}
        backLabel={info ? `${info.code} — students` : "Students"}
        title={student?.fullName ?? "Student"}
        subtitle={student ? <span className="text-xs">{student.email}</span> : undefined}
        meta={
          student && (
            <>
              <GenericPill tone="info">
                {info ? `Section ${info.section}` : "Student"}
              </GenericPill>
              <GenericPill>
                {student.personalGithubUsername
                  ? `@${student.personalGithubUsername}`
                  : "Lab-only (zero-footprint)"}
              </GenericPill>
            </>
          )
        }
      />

      {student && (
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--border-subtle)] bg-white p-5 shadow-card animate-fade-up sm:grid-cols-4">
          <Stat label="Projects" value={student.repoCount} tone="platform" />
          <Stat label="Submitted" value={student.submittedCount} tone="warning" />
          <Stat label="Marked" value={student.gradedCount} tone="success" />
          <Stat
            label="Average"
            value={student.avgGrade !== null ? `${student.avgGrade}%` : "—"}
            hint={student.avgGrade === null ? "Nothing marked yet" : undefined}
          />
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-strong)]">
          Work in this class
        </h2>

        <StateBoundary
          isLoading={board.isLoading}
          error={board.error}
          onRetry={board.refetch}
          isEmpty={rows.length === 0}
          emptyFallback={
            <EmptyState
              icon="📭"
              title="No projects yet"
              description="Once a project in this class is created and its workspaces provisioned, this student's repositories appear here."
            />
          }
          loadingFallback={<Skeleton className="h-64 w-full rounded-xl" />}
        >
          <div className="space-y-3">
            {rows.map(({ assignment, repos }) => {
              const maxPoints = pointsPerRepo(assignment);
              return (
                <Card key={assignment.id} className="overflow-hidden animate-fade-up">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] bg-slate-50/60 px-5 py-3">
                    <div className="min-w-0">
                      {/* The project is a destination too — a teacher who spots a
                          problem here usually wants the whole cohort's view of it
                          next, not just this student's. */}
                      <Link
                        href={`/teacher/classes/${classId}/projects/${assignment.id}`}
                        className="rounded-md text-sm font-semibold text-[var(--text-strong)] hover:text-platform hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
                      >
                        {assignment.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {assignment.points} pts ·{" "}
                        {assignment.dueDate
                          ? `Due ${formatDate(assignment.dueDate)}`
                          : "No due date"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {assignment.closedAt && <GenericPill tone="warning">🔒 Closed</GenericPill>}
                      {assignment.dueDate && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {relativeDue(assignment.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/*
                    One row per REPOSITORY, not per project. A SPLIT project gives
                    this student two — a backend and a frontend, each marked out of
                    half the total — and rolling them into one line would hide which
                    half is the one in trouble.
                  */}
                  {repos.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      No workspace provisioned for this student yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {repos.map(({ repo, latestRun }) => (
                        <li key={repo.id}>
                          <Link
                            href={`/teacher/repositories/${repo.id}`}
                            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-platform"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                                {repo.repoName}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <RepoStatusPill status={repo.status} />
                                {latestRun && <PipelineStatusPill status={latestRun.status} />}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <span
                                className={
                                  repo.grade !== null
                                    ? "text-sm font-semibold tabular-nums text-[var(--text-strong)]"
                                    : "text-sm tabular-nums text-[var(--text-muted)]"
                                }
                              >
                                {repo.grade !== null ? `${repo.grade}/${maxPoints}` : "Not marked"}
                              </span>
                              <span aria-hidden="true" className="text-[var(--text-muted)]">
                                →
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </StateBoundary>
      </section>

      {/* The roster row's own summary, repeated at the foot where the list ends —
          a teacher who has just read six projects should not scroll back up to
          remember what it averaged to. */}
      {student?.avgGrade !== null && student !== null && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <Avatar name={student.fullName} color={student.avatarColor} size="sm" />
            <p className="text-sm text-[var(--text-muted)]">
              Average across {student.gradedCount} marked{" "}
              {student.gradedCount === 1 ? "submission" : "submissions"} in this class
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tabular-nums text-[var(--text-strong)]">
              {student.avgGrade}%
            </span>
            <ProgressBar
              value={student.avgGrade}
              tone={gradeTone(student.avgGrade)}
              className="w-32"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
