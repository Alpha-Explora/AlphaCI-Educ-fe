"use client";
// ============================================================================
// VIEW LAYER — Class roster (teacher)
// Class info + student progress table + assignments with their submissions.
// Consumes useClassRoster + useClassAssignments. Navigation to grading happens
// via AssignmentSubmissions rows.
//
// Split across four sections, reached from a SIDE panel rather than a strip of
// tabs above the content. Overview is the teaching surface — who is enrolled and
// what they have submitted. Settings holds the section's configuration and the
// danger zone; Delete class used to sit in the page header's top-right, one
// stray click away from destroying a term of marked work, which is not a
// standing it earns next to a roster you open every day.
//
// The panel is grouped rather than flat (CLASS / PEOPLE / WORK / CONFIGURATION)
// so the four entries read as a map of what a section HAS, and so the grouping
// keeps working as sections are added — a flat list of seven would not.
// ============================================================================
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { useClassRoster } from "@/viewmodels/useClassRoster";
import { useClassAssignments } from "@/viewmodels/useClassAssignments";
import { useDeleteClass } from "@/viewmodels/useDeleteClass";
import { useTeacherCourses } from "@/viewmodels/useTeacherCourses";
import { useClassMeetingLabs } from "@/viewmodels/useClassMeetingLabs";
import type { SystemUser } from "@/models/types";
import {
  Avatar,
  Banner,
  Button,
  Card,
  EmptyState,
  GenericPill,
  Modal,
  ProgressBar,
  Skeleton,
  StateBoundary,
  SideTabs,
  type SideTabGroup,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { AssignmentSubmissions } from "@/components/domain/AssignmentSubmissions";
import { GradeReleaseControl } from "@/components/domain/GradeReleaseControl";
import { HiddenTestsPanel } from "@/components/domain/HiddenTestsPanel";
import { ProvisionRepositoriesButton } from "@/components/domain/ProvisionRepositoriesButton";
import { CreateProjectModal } from "@/components/domain/CreateProjectModal";
import { ClassOverviewTab } from "@/components/domain/ClassOverviewTab";
import { JoinCodeStrip } from "@/components/domain/JoinCodeButton";
import { formatDate, relativeDue } from "@/components/ui/format";

type ClassTab = "overview" | "students" | "assignments" | "settings";

const TAB_GROUPS: ReadonlyArray<SideTabGroup<ClassTab>> = [
  { heading: "Class", items: [{ id: "overview", label: "Overview" }] },
  { heading: "People", items: [{ id: "students", label: "Student progress" }] },
  { heading: "Work", items: [{ id: "assignments", label: "Assignments" }] },
  { heading: "Configuration", items: [{ id: "settings", label: "Settings" }] },
];

export default function ClassRosterPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const classId = params?.id ?? null;
  // Naming the meeting laboratories, and deciding which may be picked.
  const { user, labs } = useSession();
  // Unscoped: the teacher's courses across every lab decide which labs qualify.
  const teacherCourses = useTeacherCourses(user?.id ?? null);
  const roster = useClassRoster(classId);
  const assignments = useClassAssignments(classId);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [tab, setTab] = useState<ClassTab>("overview");

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

  // Where to land once the section is gone: the course that owned it, or the
  // dashboard if the class never loaded.
  const backHref = info ? `/teacher/courses/${info.courseId}` : "/teacher";
  // `replace`, not `push` — this page no longer exists, so leaving it in the
  // history would let Back land the teacher on a dead class.
  const del = useDeleteClass(classId, () => router.replace(backHref));

  const meetingLabs = useClassMeetingLabs({
    classId,
    labs,
    courses: teacherCourses.courses,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        // Classes live under a course now, so go back to the course that owns
        // this section rather than all the way out to the dashboard.
        backHref={info ? `/teacher/courses/${info.courseId}` : "/teacher"}
        backLabel={info ? `${info.code} — classes` : "My Courses"}
        title={info ? `${info.code} — ${info.name}` : "Class roster"}
        // Was the class's team slug. Dropped: it exposed the organization, and
        // the section/term pills below already identify the cohort.
        subtitle={undefined}
        meta={
          info && (
            <>
              <GenericPill tone="info">Section {info.section}</GenericPill>
              <GenericPill>{info.term}</GenericPill>
              {/* Where the class meets, which may differ from the lab that
                  stores its work — see ClassCohort.meetingLabOrgIds. */}
              {(info.meetingLabOrgIds ?? []).map((orgId) => (
                <GenericPill key={orgId}>
                  📍 {labs.find((l) => l.id === orgId)?.name ?? "Unknown laboratory"}
                </GenericPill>
              ))}
            </>
          )
        }
        // No actions here any more. Delete class lived in this slot and now
        // sits in the Settings tab's danger zone.
      />

      {/* The delete failed after the dialog closed — say so on the page, since
          the dialog is no longer there to carry the message. Above the tabs, so
          it is visible whichever one is open. */}
      {del.error && !del.isConfirming && <Banner tone="error">{del.error}</Banner>}

      {/* Side panel + the open section, as two columns on desktop and stacked
          below lg (a 224px rail beside a roster table does not fit a tablet).

          The join code rides the panel's foot rather than sitting in Overview:
          it is class-level, so it stays reachable from every section, and the
          content column keeps its full width for the roster + projects.

          items-start, and it is load-bearing. A flex row stretches its children
          to the tallest one, so the rail — now that it is a filled panel and
          not a transparent column — was being drawn as tall as whatever tab was
          open: a long blue block with an empty tail on Assignments, a short one
          on Settings. The rail's height is its own contents, on every tab. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <SideTabs
          groups={TAB_GROUPS}
          value={tab}
          onChange={setTab}
          label="Class sections"
          idPrefix="class"
          // No title/subtitle: the page header a few pixels above already reads
          // "AT1234 — AlphaTest", and the rail repeated both.
          footer={classId && <JoinCodeStrip classId={classId} compact />}
        />

        {/* min-w-0 or the roster's min-w-[640px] table refuses to shrink and
            pushes the whole row wider than the viewport instead of scrolling
            inside its own overflow container. */}
        <div className="min-w-0 flex-1 space-y-8">
          {tab === "overview" && (
            <ClassOverviewTab
              info={info}
              roster={roster}
              assignments={assignments}
              meetingLabs={meetingLabs}
              onCreateProject={() => setCreateOpen(true)}
              onSeeStudents={() => setTab("students")}
              onSeeAssignments={() => setTab("assignments")}
            />
          )}

          {tab === "students" && (
            <div
              id="class-panel-students"
              role="tabpanel"
              aria-labelledby="class-tab-students"
              className="space-y-8"
            >
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
            </div>
          )}

          {tab === "assignments" && (
            <div
              id="class-panel-assignments"
              role="tabpanel"
              aria-labelledby="class-tab-assignments"
              className="space-y-8"
            >
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
                            {a.dueDate ? (
                              <>
                                <p>{relativeDue(a.dueDate)}</p>
                                <p>Due {formatDate(a.dueDate)}</p>
                              </>
                            ) : (
                              <p>No due date</p>
                            )}
                          </div>
                        </div>
                        <AssignmentSubmissions
                          assignmentId={a.id}
                          points={a.points}
                          usersById={usersById}
                        />
                        <div className="space-y-4 px-5 pb-4">
                          <HiddenTestsPanel assignmentId={a.id} />
                          <GradeReleaseControl
                            assignmentId={a.id}
                            releasedAt={a.gradesReleasedAt}
                          />
                        </div>
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
            </div>
          )}

          {tab === "settings" && (
            <div
              id="class-panel-settings"
              role="tabpanel"
              aria-labelledby="class-tab-settings"
              className="space-y-8"
            >
              <Card className="border-red-200 p-5 animate-fade-up sm:max-w-2xl">
                <h2 className="text-base font-semibold text-[var(--text-strong)]">
                  Danger zone
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  Actions here affect this section only. Your other sections and the
                  course itself are untouched.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-strong)]">
                      Delete this class
                    </p>
                    {/* Named rather than generic: "delete this class" is abstract
                        until you see which section it means. */}
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                      Permanently deletes{" "}
                      {info
                        ? `${info.code} — Section ${info.section}`
                        : "this section"}
                      , its projects, and every student&rsquo;s submitted and graded
                      work. This cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={del.askToDelete}
                    disabled={!info}
                    className="shrink-0"
                  >
                    Delete class
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/*
        Destructive, permanent and cascading, so it is confirmed rather than
        instant. The copy uses this section's REAL counts — a generic "this
        cannot be undone" doesn't tell a teacher whether they're about to lose
        an empty trial section or a term's worth of marked work.
      */}
      <Modal
        open={del.isConfirming}
        onClose={del.cancel}
        title={`Delete ${info ? `${info.code} — Section ${info.section}` : "this class"}?`}
        description="This permanently deletes the class section. It cannot be undone."
        size="md"
      >
        <div className="space-y-4">
          {del.error && <Banner tone="error">{del.error}</Banner>}

          <ul className="space-y-1.5 text-sm text-[var(--text-muted)]">
            <li>
              •{" "}
              <strong className="text-[var(--text-strong)]">
                {assignments.assignments.length}{" "}
                {assignments.assignments.length === 1 ? "project" : "projects"}
              </strong>{" "}
              in this section are deleted, along with every student repository
              under them and any submitted or graded work.
            </li>
            <li>
              • {students.length} {students.length === 1 ? "student is" : "students are"}{" "}
              unenrolled.{" "}
              <span className="text-[var(--text-strong)]">
                Their accounts are kept
              </span>{" "}
              — only their place in this section goes.
            </li>
            <li>• The join code stops working immediately.</li>
            <li>• The course itself and your other sections are untouched.</li>
          </ul>

          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button variant="secondary" onClick={del.cancel} disabled={del.isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={del.confirm} loading={del.isDeleting}>
              {del.isDeleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create project (teacher-only surface). Mount on open so form state
          initializes from the loaded roster (all students checked by default). */}
      {classId && createOpen && (
        <CreateProjectModal
          open
          onClose={() => setCreateOpen(false)}
          classInfo={
            info ?? { id: classId, code: "Class", section: "—", name: "Selected class", term: "" }
          }
          students={students}
        />
      )}
    </div>
  );
}
