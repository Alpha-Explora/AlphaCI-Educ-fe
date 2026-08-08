"use client";
// ============================================================================
// VIEW LAYER — Student groups (teacher, read-only).
// Shows how students are grouped in each GROUP project of the selected class.
// Groups are formed in the create-project group builder; this page is the place
// to SEE them, so a teacher doesn't have to reopen a project to check who is
// working with whom. Derivation lives in useTeacherGroups.
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherDashboard } from "@/viewmodels/useTeacherDashboard";
import { useTeacherGroups } from "@/viewmodels/useTeacherGroups";
import {
  Avatar,
  Card,
  EmptyState,
  GenericPill,
  Select,
  Skeleton,
  Stat,
  StateBoundary,
} from "@/components/ui";

export default function TeacherGroupsPage() {
  const { user, selectedOrgId } = useSession();
  const dash = useTeacherDashboard(user?.id ?? null, selectedOrgId);
  const classes = dash.data?.classes ?? [];

  // Null until the teacher picks one; fall back to their first class so the
  // page shows something useful on arrival.
  const [pickedClassId, setPickedClassId] = useState<string | null>(null);
  const classId = pickedClassId ?? classes[0]?.id ?? null;
  const activeClass = classes.find((c) => c.id === classId) ?? null;

  const groups = useTeacherGroups(classId);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            Student Groups
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Who works with whom on each group project. Groups are formed when you create
            a group project.
          </p>
        </div>

        {classes.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="group-class"
              className="text-sm font-medium text-[var(--text-muted)]"
            >
              Class
            </label>
            <Select
              id="group-class"
              value={classId ?? ""}
              onChange={(e) => setPickedClassId(e.target.value)}
              className="max-w-[18rem]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · Section {c.section} — {c.term}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* No classes at all — nothing to group yet. */}
      {!dash.isLoading && classes.length === 0 ? (
        <EmptyState
          icon="🏫"
          title="No classes yet"
          description="Create a class inside one of your courses first. Once it has a group project, the groups show up here."
        />
      ) : (
        <>
          {/* Rollup */}
          {!groups.isLoading && !groups.error && (
            <div className="grid grid-cols-3 gap-6 rounded-xl border border-[var(--border-subtle)] bg-white p-5 shadow-card animate-fade-up sm:max-w-lg">
              <Stat label="Group projects" value={groups.totals.projects} tone="platform" />
              <Stat label="Groups" value={groups.totals.groups} />
              <Stat label="Grouped students" value={groups.totals.groupedStudents} />
            </div>
          )}

          <StateBoundary
            isLoading={dash.isLoading || groups.isLoading}
            error={dash.error ?? groups.error}
            onRetry={groups.refetch}
            isEmpty={groups.projects.length === 0}
            emptyFallback={
              <EmptyState
                icon="👥"
                title="No group projects in this class"
                description={
                  activeClass
                    ? `Section ${activeClass.section} has no GROUP project yet. Create one from the class page and pick its groups — they'll appear here.`
                    : "Create a group project to form student groups."
                }
                action={
                  classId && (
                    <Link
                      href={`/teacher/classes/${classId}`}
                      className="text-sm font-medium text-platform hover:underline"
                    >
                      Open class →
                    </Link>
                  )
                }
              />
            }
            loadingFallback={<Skeleton className="h-64 w-full rounded-xl" />}
          >
            <div className="space-y-6">
              {groups.projects.map((project) => (
                <Card key={project.assignment.id} className="overflow-hidden animate-fade-up">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-[var(--text-strong)]">
                          {project.assignment.title}
                        </h2>
                        <GenericPill tone="info">Group</GenericPill>
                        {project.assignment.closedAt && (
                          <GenericPill tone="warning">🔒 Closed</GenericPill>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-[var(--text-muted)]">
                        {project.assignment.description}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {project.groups.length}{" "}
                      {project.groups.length === 1 ? "group" : "groups"}
                    </p>
                  </div>

                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {project.groups.map((group) => (
                      <li
                        key={group.key}
                        className="flex flex-wrap items-start gap-x-6 gap-y-3 px-5 py-4"
                      >
                        <div className="w-24 shrink-0">
                          <p className="text-sm font-semibold text-[var(--text-strong)]">
                            {group.label}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {group.members.length}{" "}
                            {group.members.length === 1 ? "member" : "members"}
                          </p>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                          {group.members.length === 0 ? (
                            <span className="text-sm text-[var(--text-muted)]">
                              No members recorded
                            </span>
                          ) : (
                            group.members.map((m) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-strong)]"
                              >
                                <Avatar name={m.fullName} color={m.avatarColor} size="sm" />
                                {m.fullName}
                              </span>
                            ))
                          )}
                        </div>

                        {/* One link per repo: SPLIT projects have a BE and an FE. */}
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {group.repos.map((r) => (
                            <Link
                              key={r.id}
                              href={`/teacher/repositories/${r.id}`}
                              className="text-xs font-medium text-platform hover:underline"
                            >
                              {r.component === "SINGLE" ? "Open workspace" : `Open ${r.component.toLowerCase()}`} →
                            </Link>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}

              {groups.ungrouped.length > 0 && (
                <Card className="p-5 animate-fade-up">
                  <h2 className="text-sm font-semibold text-[var(--text-strong)]">
                    Not in any group
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Enrolled in this class but not a member of any group project.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {groups.ungrouped.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]"
                      >
                        <Avatar name={s.fullName} color={s.avatarColor} size="sm" />
                        {s.fullName}
                      </span>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </StateBoundary>
        </>
      )}
    </div>
  );
}
