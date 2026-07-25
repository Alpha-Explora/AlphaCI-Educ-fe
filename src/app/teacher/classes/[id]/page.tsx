"use client";
// ============================================================================
// VIEW LAYER — Class roster (teacher)
// Class info + student progress table + assignments with their submissions.
// Consumes useClassRoster + useClassAssignments. Navigation to grading happens
// via AssignmentSubmissions rows.
// ============================================================================
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useClassRoster } from "@/viewmodels/useClassRoster";
import { useClassAssignments } from "@/viewmodels/useClassAssignments";
import type { SystemUser } from "@/models/types";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  GenericPill,
  ProgressBar,
  Skeleton,
  Stat,
  StateBoundary,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { AssignmentSubmissions } from "@/components/domain/AssignmentSubmissions";
import { ProvisionRepositoriesButton } from "@/components/domain/ProvisionRepositoriesButton";
import { CreateProjectModal } from "@/components/domain/CreateProjectModal";
import { JoinCodeCard } from "@/components/domain/JoinCodeCard";
import { formatDate, relativeDue } from "@/components/ui/format";

export default function ClassRosterPage() {
  const params = useParams<{ id: string }>();
  const classId = params?.id ?? null;
  const roster = useClassRoster(classId);
  const assignments = useClassAssignments(classId);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Build a userId → SystemUser map so submission rows can show owner names.
  const usersById = useMemo<Record<string, SystemUser>>(() => {
    const map: Record<string, SystemUser> = {};
    for (const s of roster.data?.students ?? []) map[s.id] = s;
    for (const t of roster.data?.teachers ?? []) map[t.id] = t;
    return map;
  }, [roster.data]);

  const info = roster.data?.classInfo;
  const students = roster.data?.students ?? [];
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/teacher"
        backLabel="Class Groups"
        title={info ? `${info.code} — ${info.name}` : "Class roster"}
        subtitle={
          info ? (
            <span className="font-mono text-xs">@{info.githubTeamSlug}</span>
          ) : undefined
        }
        meta={
          info && (
            <>
              <GenericPill tone="info">Section {info.section}</GenericPill>
              <GenericPill>{info.term}</GenericPill>
            </>
          )
        }
      />

      {/* Rollup */}
      {!roster.isLoading && !roster.error && roster.data && (
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--border-subtle)] bg-white p-5 shadow-card animate-fade-up sm:grid-cols-4 sm:max-w-2xl">
          <Stat label="Students" value={roster.rollup.studentCount} tone="platform" />
          <Stat label="Submitted" value={roster.rollup.submitted} tone="warning" />
          <Stat label="Graded" value={roster.rollup.graded} tone="success" />
          <Stat
            label="Class avg"
            value={roster.rollup.classAvg !== null ? `${roster.rollup.classAvg}%` : "—"}
          />
        </div>
      )}

      {/* Join code (whiteboard flow) */}
      {classId && <JoinCodeCard classId={classId} />}

      {/* Roster table */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-strong)]">
          Student progress
        </h2>
        <StateBoundary
          isLoading={roster.isLoading}
          error={roster.error}
          onRetry={roster.refetch}
          isEmpty={(roster.data?.students.length ?? 0) === 0}
          emptyFallback={
            <EmptyState
              icon="👥"
              title="No students enrolled"
              description="Students enrolled via SSO/SCIM will appear here."
            />
          }
          loadingFallback={<Skeleton className="h-64 w-full rounded-xl" />}
        >
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-slate-50/70 text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Student
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Repos
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Submitted
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Graded
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Avg grade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {roster.data?.students.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.fullName} color={s.avatarColor} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--text-strong)]">
                              {s.fullName}
                            </p>
                            <p className="truncate text-xs text-[var(--text-muted)]">
                              {s.personalGithubUsername
                                ? `@${s.personalGithubUsername}`
                                : "Lab-only (zero-footprint)"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[var(--text-muted)]">
                        {s.repoCount}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{s.submittedCount}</td>
                      <td className="px-4 py-3 tabular-nums">{s.gradedCount}</td>
                      <td className="px-4 py-3">
                        {s.avgGrade !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="w-9 shrink-0 font-semibold tabular-nums text-[var(--text-strong)]">
                              {s.avgGrade}%
                            </span>
                            <ProgressBar
                              value={s.avgGrade}
                              tone={
                                s.avgGrade >= 80
                                  ? "success"
                                  : s.avgGrade >= 60
                                    ? "platform"
                                    : "warning"
                              }
                              className="w-24"
                            />
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </StateBoundary>
      </section>

      {/* Assignments + submissions */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">
            Assignments &amp; submissions
          </h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <span aria-hidden="true">＋</span> Create project
          </Button>
        </div>
        <StateBoundary
          isLoading={assignments.isLoading}
          error={assignments.error}
          isEmpty={assignments.assignments.length === 0}
          emptyFallback={
            <EmptyState
              icon="📝"
              title="No assignments yet"
              description="Create an assignment to generate per-student repositories."
            />
          }
          loadingFallback={<Skeleton className="h-40 w-full rounded-xl" />}
        >
          <div className="space-y-5">
            {assignments.assignments.map((a) => (
              <Card key={a.id} className="overflow-hidden animate-fade-up">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--text-strong)]">
                        {a.title}
                      </h3>
                      {a.isGroup && <GenericPill tone="info">Group</GenericPill>}
                      {a.closedAt && <GenericPill tone="warning">🔒 Closed</GenericPill>}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-[var(--text-muted)]">
                      {a.description}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[var(--text-muted)]">
                    <p className="font-medium text-[var(--text-strong)]">
                      {a.points} pts
                    </p>
                    <p>{relativeDue(a.dueDate)}</p>
                    <p>Due {formatDate(a.dueDate)}</p>
                  </div>
                </div>
                <AssignmentSubmissions
                  assignmentId={a.id}
                  points={a.points}
                  usersById={usersById}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-slate-50/60 px-5 py-3">
                  <p className="text-xs text-[var(--text-muted)]">
                    {a.isGroup
                      ? `Creates one shared GitHub repository per group in Section ${info?.section ?? "this section"}.`
                      : `Creates one GitHub repository per selected student in Section ${info?.section ?? "this section"}.`}
                  </p>
                  <div className="flex items-center gap-2">
                    {a.closedAt ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={assignments.isSettingClosed && assignments.closingId === a.id}
                        onClick={() => assignments.setProjectClosed(a.id, false)}
                      >
                        Reopen
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={assignments.isSettingClosed && assignments.closingId === a.id}
                        onClick={() => assignments.setProjectClosed(a.id, true)}
                      >
                        <span aria-hidden="true">🔒</span> End project
                      </Button>
                    )}
                    {confirmingDeleteId === a.id ? (
                      <>
                        <span className="text-xs text-red-700">
                          Delete &ldquo;{a.title}&rdquo; + its repos?
                        </span>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={assignments.isDeleting && assignments.deletingId === a.id}
                          onClick={() => assignments.deleteAssignment(a.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmingDeleteId(a.id)}
                      >
                        <span aria-hidden="true">🗑</span> Delete
                      </Button>
                    )}
                    <ProvisionRepositoriesButton assignmentId={a.id} />
                  </div>
                </div>
                {assignments.deleteError && assignments.deletingId === a.id && (
                  <p className="border-t border-[var(--border-subtle)] bg-red-50 px-5 py-2 text-sm text-red-700">
                    {assignments.deleteError}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </StateBoundary>
      </section>

      {/* Create project (teacher-only surface). Mount on open so form state
          initializes from the loaded roster (all students checked by default). */}
      {classId && createOpen && (
        <CreateProjectModal
          open
          onClose={() => setCreateOpen(false)}
          classInfo={info ?? { id: classId, code: "Class", section: "—", name: "Selected class" }}
          students={students}
        />
      )}
    </div>
  );
}
