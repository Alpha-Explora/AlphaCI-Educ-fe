"use client";
// ============================================================================
// VIEW LAYER — Class roster (teacher)
// Class info + student progress table + assignments with their submissions.
// Consumes useClassRoster + useClassAssignments. Navigation to grading happens
// via AssignmentSubmissions rows.
//
// Split across four sections, reached from a SIDE panel rather than a strip of
// tabs above the content. Overview is the teaching surface — who is enrolled and
// what they have submitted. Settings holds the section's configuration, and only
// that: class access (start / rotate / end) beside the read-only timetable.
//
// NOTHING DESTRUCTIVE ON THIS PAGE. Delete class travelled from the header's
// top-right, to a Settings danger zone, to the IT admin's /admin/sections — the
// same owner who creates sections, since a section books a person and a room and
// deleting one is that decision reversed. A teacher who wants a section finished
// ends its projects instead, which stops the work without destroying it.
//
// The panel is grouped rather than flat (CLASS / PEOPLE / WORK / CONFIGURATION)
// so the four entries read as a map of what a section HAS, and so the grouping
// keeps working as sections are added — a flat list of seven would not.
// ============================================================================
import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { useClassRoster } from "@/viewmodels/useClassRoster";
import { useClassAssignments } from "@/viewmodels/useClassAssignments";
import { useTeacherCourses } from "@/viewmodels/useTeacherCourses";
import { useClassMeetingLabs } from "@/viewmodels/useClassMeetingLabs";
import type { SystemUser } from "@/models/types";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  GenericPill,
  ProgressBar,
  Skeleton,
  StateBoundary,
  SideTabs,
  type SideTabGroup,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { TeacherProjectList } from "@/components/domain/TeacherProjectList";
import { ClassHoursSummary } from "@/components/domain/ClassHoursSummary";
import { ClassAccessPanel } from "@/components/domain/ClassAccessPanel";
import { CreateProjectModal } from "@/components/domain/CreateProjectModal";
import { ClassOverviewTab } from "@/components/domain/ClassOverviewTab";
import { JoinCodeStrip } from "@/components/domain/JoinCodeButton";

type ClassTab = "overview" | "students" | "assignments" | "settings";

const TAB_GROUPS: ReadonlyArray<SideTabGroup<ClassTab>> = [
  { heading: "Class", items: [{ id: "overview", label: "Overview" }] },
  { heading: "People", items: [{ id: "students", label: "Student progress" }] },
  { heading: "Work", items: [{ id: "assignments", label: "Assignments" }] },
  { heading: "Configuration", items: [{ id: "settings", label: "Settings" }] },
];

const TAB_IDS: readonly ClassTab[] = ["overview", "students", "assignments", "settings"];

/**
 * The tab a `?tab=` link asks for, or Overview.
 *
 * Read ONCE, as the initial state — not kept in sync with the URL on every
 * change. The tab was previously private state on the grounds that a reading
 * position is not a destination worth sharing, and that was right while every
 * tab's contents lived on this page. Projects and students are now pages of
 * their own, so their back links have somewhere to point BACK to, and landing a
 * teacher on Overview after they came from Assignments is a lost place.
 *
 * Validated against the union rather than cast: `?tab=` is user-supplied, and an
 * unrecognised value should open Overview, not render nothing.
 */
function initialTab(raw: string | null): ClassTab {
  return TAB_IDS.find((id) => id === raw) ?? "overview";
}

/**
 * The page, wrapped so `useSearchParams` has a Suspense boundary above it.
 *
 * Required by the App Router: a client component that reads search params forces
 * the route to bail out of static rendering, and Next refuses to build one that
 * is not suspended. The fallback is the same skeleton shape the roster shows
 * while it loads, so the boundary is invisible in practice.
 */
export default function ClassRosterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <ClassRosterContent />
    </Suspense>
  );
}

function ClassRosterContent() {
  const params = useParams<{ id: string }>();
  const classId = params?.id ?? null;
  // Naming the meeting laboratories, and deciding which may be picked.
  const { user, labs } = useSession();
  // Unscoped: the teacher's courses across every lab decide which labs qualify.
  const teacherCourses = useTeacherCourses(user?.id ?? null);
  const roster = useClassRoster(classId);
  const assignments = useClassAssignments(classId);
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ClassTab>(() => initialTab(searchParams.get("tab")));

  // The userId → SystemUser map that used to live here went with the submission
  // rows it fed: those render on the project's own page now, which builds it from
  // the same roster query this page already warms.
  const info = roster.data?.classInfo;
  const students = roster.data?.students ?? [];
  const [createOpen, setCreateOpen] = useState(false);

  const meetingLabs = useClassMeetingLabs({
    classId,
    labs,
    courses: teacherCourses.courses,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        // Teacher area: title at the right of the band. See PageHeader's titleAlign.
        titleAlign="end"
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
        // No actions here any more. Delete class lived in this slot, moved to
        // the Settings tab's danger zone, and has now left the teacher's surface
        // entirely — it is the IT admin's, on /admin/sections.
      />

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
          {tab === "overview" && classId && (
            <ClassOverviewTab
              info={info}
              classId={classId}
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
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                    Student progress
                  </h2>
                  {/* The count, because the table scrolls inside itself and a
                      scroll area does not show how much is in it. */}
                  {students.length > 0 && (
                    <p className="text-sm text-[var(--text-muted)]">
                      {students.length} {students.length === 1 ? "student" : "students"}
                    </p>
                  )}
                </div>
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
                    {/*
                      Scrolls in BOTH directions, inside itself.

                      Horizontally because the table has a 640px floor and a rail
                      sits beside it; vertically because a cohort is thirty or
                      forty people and the page's length should not be decided by
                      how many enrolled. `max-h`, not `h`, so a section of five
                      does not draw an empty box the height of a section of fifty.
                    */}
                    <div className="max-h-[34rem] overflow-auto overscroll-contain">
                      <table className="w-full min-w-[640px] text-sm">
                        {/* Sticky, or scrolling past row twelve leaves five
                            columns of numbers with nothing naming them. */}
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b border-[var(--border-subtle)] bg-slate-50 text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
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
                                {/* The same destination the Overview roster
                                    leads to. A table row cannot be an anchor, so
                                    the link is the identity cell — which is the
                                    part a teacher aims at anyway. */}
                                <Link
                                  href={`/teacher/classes/${classId}/students/${s.id}`}
                                  className="flex items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
                                >
                                  <Avatar name={s.fullName} color={s.avatarColor} size="sm" />
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-[var(--text-strong)] group-hover:underline">
                                      {s.fullName}
                                    </p>
                                    <p className="truncate text-xs text-[var(--text-muted)]">
                                      {s.personalGithubUsername
                                        ? `@${s.personalGithubUsername}`
                                        : "Lab-only (zero-footprint)"}
                                    </p>
                                  </div>
                                </Link>
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
              {/*
                A LIST OF PROJECTS, not a stack of them.

                This was "Assignments & submissions" — every project an accordion
                whose expanded body carried the submission list, the hidden-tests
                panel, the marks control and four actions. Opening the one you
                wanted pushed the rest of the term below the fold, so finding a
                project and working on it were the same scroll.

                Each row now links to the project's own page, which is where all
                of that moved. The heading dropped "& submissions" to match: those
                live one click in, and promising them here would be the same lie
                the accordion told.
              */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                      Projects
                    </h2>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                      Open a project to see its submissions, hidden tests and marks.
                    </p>
                  </div>
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
                  {classId && (
                    <TeacherProjectList
                      assignments={assignments.assignments}
                      classId={classId}
                    />
                  )}
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
              {/*
                Two cards, side by side from xl and stacked below it.

                They were a single 672px-capped column, which left roughly half
                the content area empty on a desktop — and the emptiness read as
                "something failed to load" rather than "this section is
                configured". With the danger zone gone there are only two cards
                left, so the pair fills the row instead.

                items-start so the shorter card keeps its own height: a Class
                hours card stretched to match an OPEN access card (which grows by
                the code, the joined count and two buttons) would be mostly blank
                space with a rule around it.

                Access leads: starting the class is what a teacher opens this tab
                to DO, whereas the hours are read once a term.
              */}
              <div className="grid items-start gap-6 xl:grid-cols-2">
                <ClassAccessPanel
                  classId={classId}
                  sectionLabel={
                    info ? `${info.code} · ${info.section}` : "this section"
                  }
                  hasSchedule={Boolean(info?.schedule)}
                />

                {/*
                  READ-ONLY. Class hours are the IT admin's to set now: a section's
                  window books a person and a room, and neither is one teacher's to
                  claim. The card that edited them is gone rather than disabled —
                  a form whose Save always 403s is worse than no form.
                */}
                <ClassHoursSummary schedule={info?.schedule} />
              </div>

              {/*
                NO DANGER ZONE. Deleting a section is the IT admin's, on
                /admin/sections. Creating one is already theirs — it books a
                person and a room — and deleting is that decision run backwards,
                so it cannot belong to a different owner.

                Removed rather than disabled, for the same reason the schedule
                editor was: a button that always 403s teaches a teacher the
                product is broken. The backend refuses non-admins too
                (ClassesService.deleteClass), so this is not the only guard.

                What a teacher wants when a section is over is on the Assignments
                tab: ending a project stops the work without destroying a term of
                marked submissions.
              */}
            </div>
          )}
        </div>
      </div>

      {/* The delete-confirmation modal went with the danger zone. The admin's
          own confirmation lives on /admin/sections, where the capability now is. */}

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
