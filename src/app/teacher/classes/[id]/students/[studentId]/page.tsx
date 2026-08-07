"use client";
// ============================================================================
// VIEW LAYER — one student, within one class (teacher).
//
// The destination a name on the roster leads to. Before this, a student was a
// row of counters — "3 submitted · 1 marked · 62%" — and the only way to reach
// their actual work was to go project by project through the Assignments tab and
// find their name in each submission list. For a teacher following up with one
// person that is the wrong axis entirely: they hold a student in mind, not a
// project.
//
// SAME RAIL as the class page, the project page and the repository page. The
// first version stacked its cards in one column, which is the shape every one of
// those pages was restructured away from; a teacher who has learned the pattern
// anywhere in the teacher area already knows this page.
//
// The two sections are genuinely different questions. "Projects" is the work —
// what they hold, what state it is in, and the way into marking it. "Student
// details" is the account — the identity behind it, which is what you check when
// the work is missing rather than when it is wrong.
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
import { useMemo, useState } from "react";
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
  SideTabs,
  Skeleton,
  Stat,
  StateBoundary,
  type SideTabGroup,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { formatDate, formatDateTime, relativeDue } from "@/components/ui/format";
import { pointsPerRepo } from "@/models/points";

type StudentTab = "work" | "details";

const TAB_GROUPS: ReadonlyArray<SideTabGroup<StudentTab>> = [
  { heading: "Work", items: [{ id: "work", label: "Projects" }] },
  { heading: "Person", items: [{ id: "details", label: "Student details" }] },
];

/** ProgressBar's palette, which has a brand tone for the middle band. */
function gradeTone(avg: number): "success" | "platform" | "warning" {
  if (avg >= 80) return "success";
  if (avg >= 60) return "platform";
  return "warning";
}

/**
 * The same three bands in the PILL palette, which has no brand tone.
 *
 * Two functions rather than one cast: the tone unions genuinely differ, and
 * passing the bar's `platform` to a pill is a type error the compiler caught
 * before it could ship an unstyled chip.
 */
function gradePillTone(avg: number): "success" | "info" | "warning" {
  if (avg >= 80) return "success";
  if (avg >= 60) return "info";
  return "warning";
}

export default function TeacherStudentPage() {
  const params = useParams<{ id: string; studentId: string }>();
  const classId = params?.id ?? null;
  const studentId = params?.studentId ?? null;

  const backHref = `/teacher/classes/${classId}?tab=students`;

  const roster = useClassRoster(classId);
  const board = useStudentDashboard(studentId);
  const [tab, setTab] = useState<StudentTab>("work");

  const info = roster.data?.classInfo;
  // The roster's row, for the counters and the average. Computed by the server
  // over this class only, which is the same scope this page shows — so the
  // summary and the list below it cannot disagree.
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
              {student.avgGrade !== null && (
                <GenericPill tone={gradePillTone(student.avgGrade)}>
                  {student.avgGrade}% average
                </GenericPill>
              )}
            </>
          )
        }
      />

      {/* Above the rail, not inside a tab: these four numbers describe the
          student rather than any one section, and a teacher who switches to
          Student details should not lose sight of why they went looking. */}
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

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <SideTabs
          groups={TAB_GROUPS}
          value={tab}
          onChange={setTab}
          label="Student sections"
          idPrefix="student"
        />

        <div className="min-w-0 flex-1 space-y-8">
          {tab === "work" && (
            <div
              id="student-panel-work"
              role="tabpanel"
              aria-labelledby="student-tab-work"
              className="space-y-4"
            >
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
                {/*
                  ONE container, scrolled — not one card per project.

                  A class runs a project a week, so this list is as long as the
                  term and the page grew with it. Capping it means the section is
                  the same height in week twelve as in week one, and the rail
                  beside it stays reachable without scrolling back up.
                */}
                <Card className="overflow-hidden">
                  <p className="border-b border-[var(--border-subtle)] bg-slate-50/60 px-4 py-2 text-xs text-[var(--text-muted)]">
                    {rows.length} {rows.length === 1 ? "project" : "projects"}
                  </p>
                  <div className="max-h-[32rem] divide-y divide-[var(--border-subtle)] overflow-y-auto overscroll-contain">
                    {rows.map(({ assignment, repos }) => {
                      const maxPoints = pointsPerRepo(assignment);
                      return (
                        <div key={assignment.id}>
                          <div className="flex flex-wrap items-start justify-between gap-3 bg-slate-50/40 px-4 py-2.5">
                            <div className="min-w-0">
                              {/* The project is a destination too — a teacher who
                                  spots a problem here usually wants the whole
                                  cohort's view of it next. */}
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
                              {assignment.closedAt && (
                                <GenericPill tone="warning">🔒 Closed</GenericPill>
                              )}
                              {assignment.dueDate && (
                                <span className="text-xs text-[var(--text-muted)]">
                                  {relativeDue(assignment.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/*
                            One row per REPOSITORY, not per project. A SPLIT
                            project gives this student two — a backend and a
                            frontend, each marked out of half the total — and
                            rolling them into one line would hide which half is
                            the one in trouble.
                          */}
                          {repos.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-[var(--text-muted)]">
                              No workspace provisioned for this student yet.
                            </p>
                          ) : (
                            <ul>
                              {repos.map(({ repo, latestRun }) => (
                                <li key={repo.id}>
                                  <Link
                                    href={`/teacher/repositories/${repo.id}`}
                                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-platform"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                                        {repo.repoName}
                                      </p>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <RepoStatusPill status={repo.status} />
                                        {latestRun && (
                                          <PipelineStatusPill status={latestRun.status} />
                                        )}
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
                                        {repo.grade !== null
                                          ? `${repo.grade}/${maxPoints}`
                                          : "Not marked"}
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
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </StateBoundary>

              {student?.avgGrade !== null && student !== null && (
                <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <p className="text-sm text-[var(--text-muted)]">
                    Average across {student.gradedCount} marked{" "}
                    {student.gradedCount === 1 ? "submission" : "submissions"} in this class
                  </p>
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
          )}

          {tab === "details" && (
            <div
              id="student-panel-details"
              role="tabpanel"
              aria-labelledby="student-tab-details"
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                Student details
              </h2>

              {student ? (
                <Card className="p-5">
                  <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4">
                    <Avatar name={student.fullName} color={student.avatarColor} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--text-strong)]">
                        {student.fullName}
                      </p>
                      <p className="truncate text-sm text-[var(--text-muted)]">
                        {student.email}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-[var(--text-muted)]">Account status</dt>
                      <dd className="mt-0.5">
                        <GenericPill tone={student.status === "ACTIVE" ? "success" : "warning"}>
                          {student.status}
                        </GenericPill>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--text-muted)]">GitHub identity</dt>
                      {/* The commonest reason a teacher opens this tab: work is
                          missing and the question is whether the student can push
                          at all. Lab-only is the normal answer, not a fault. */}
                      <dd className="mt-0.5 text-sm font-medium text-[var(--text-strong)]">
                        {student.personalGithubUsername
                          ? `@${student.personalGithubUsername}`
                          : "Lab-only (zero-footprint)"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--text-muted)]">Joined</dt>
                      <dd className="mt-0.5 text-sm font-medium text-[var(--text-strong)]">
                        {formatDateTime(student.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--text-muted)]">Section</dt>
                      <dd className="mt-0.5 text-sm font-medium text-[var(--text-strong)]">
                        {info ? `${info.code} — Section ${info.section}` : "—"}
                      </dd>
                    </div>
                  </dl>
                </Card>
              ) : (
                <Skeleton className="h-48 w-full rounded-xl" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
