"use client";
// ============================================================================
// VIEW LAYER — the Overview tab of a class section.
//
// Overview answers two questions, in the order a teacher asks them: WHO is in
// this section and WHAT is due. Both now live side by side in a single card,
// because they are read together — "has Ana submitted the thing due Friday?" is
// one question, and it used to span two separate panels.
//
// The roster is scrolled rather than truncated. A class is thirty or forty
// people; a preview of six with a "+34 more" link answers "how many" but never
// "who", which is the only thing a name list is for.
//
// Everything here is derived from data the page has already loaded (roster +
// assignments), so this tab issues no request of its own and cannot disagree
// with the tabs either side of it.
//
// Lives in its own file because the page component was carrying four tabs, two
// dialogs and a delete flow; the Overview markup was the largest single block
// in it and the one with no shared state.
// ============================================================================
import { useMemo } from "react";
import type { Assignment, ClassCohort, ClassRoster } from "@/models/types";
import type { ClassRosterVM } from "@/viewmodels/useClassRoster";
import type { ClassAssignmentsVM } from "@/viewmodels/useClassAssignments";
import type { ClassMeetingLabsVM } from "@/viewmodels/useClassMeetingLabs";
import {
  Avatar,
  Button,
  Card,
  GenericPill,
  ProgressBar,
  SectionHeading,
  Skeleton,
  Stat,
} from "@/components/ui";
import { formatDate, relativeDue } from "@/components/ui/format";
import { MeetingLabsButton } from "./MeetingLabsButton";

type RosterStudent = ClassRoster["students"][number];

/** How many projects fit before the list stops being a summary. */
const PROJECT_PREVIEW = 4;

/**
 * Projects by deadline, soonest first, undated last.
 *
 * Undated projects sort to the END rather than being treated as due at epoch
 * (which would pin them to the top as if overdue) or at infinity-with-a-hidden
 * filter. They are ongoing work: not the most urgent thing in the class, not
 * something to hide either.
 */
function byDeadline(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

function gradeTone(avg: number): "success" | "platform" | "warning" {
  if (avg >= 80) return "success";
  if (avg >= 60) return "platform";
  return "warning";
}

/**
 * One roster row: who they are on the left, where they stand on the right.
 *
 * A student with no mark yet still gets a right-hand cell — "Not started" and
 * "Awaiting marking" are states a teacher acts on, and an empty cell would make
 * them look identical to each other.
 */
function StudentRow({ student }: Readonly<{ student: RosterStudent }>) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar name={student.fullName} color={student.avatarColor} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-strong)]">
          {student.fullName}
        </p>
        <p className="truncate text-xs tabular-nums text-[var(--text-muted)]">
          {student.submittedCount} submitted · {student.gradedCount} marked
        </p>
      </div>

      <div className="shrink-0 text-right">
        {student.avgGrade !== null ? (
          <>
            <span className="text-sm font-semibold tabular-nums text-[var(--text-strong)]">
              {student.avgGrade}%
            </span>
            <ProgressBar
              className="mt-1 w-16"
              value={student.avgGrade}
              tone={gradeTone(student.avgGrade)}
            />
          </>
        ) : (
          <GenericPill tone={student.submittedCount === 0 ? "neutral" : "warning"}>
            {student.submittedCount === 0 ? "Not started" : "Awaiting marking"}
          </GenericPill>
        )}
      </div>
    </li>
  );
}

function StudentsPanel({
  roster,
  onSeeStudents,
}: Readonly<{ roster: ClassRosterVM; onSeeStudents: () => void }>) {
  const students = roster.data?.students ?? [];
  const notStarted = students.filter((s) => s.submittedCount === 0).length;
  const awaiting = Math.max(roster.rollup.submitted - roster.rollup.graded, 0);

  // Marking state in one line, in the header, where the old Marking progress
  // card used to spend a whole panel on two bars and two counters.
  let subtitle = "No students have joined yet.";
  if (students.length > 0) {
    subtitle = `${roster.rollup.graded} of ${roster.rollup.submitted} submissions marked`;
    if (awaiting > 0) subtitle += ` · ${awaiting} waiting`;
    if (notStarted > 0) subtitle += ` · ${notStarted} not started`;
  }

  return (
    <section className="p-5">
      <SectionHeading
        title="Students"
        subtitle={subtitle}
        action={
          students.length > 0 && (
            <button
              type="button"
              onClick={onSeeStudents}
              className="rounded-md text-sm font-medium text-platform hover:underline"
            >
              Full progress <span aria-hidden="true">→</span>
            </button>
          )
        }
      />

      {roster.isLoading && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!roster.isLoading && roster.error && (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Couldn&rsquo;t load the roster.{" "}
          <button
            type="button"
            onClick={roster.refetch}
            className="rounded-md font-medium text-platform hover:underline"
          >
            Try again
          </button>
        </p>
      )}

      {!roster.isLoading && !roster.error && students.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] p-5 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Nobody has joined this section yet. Read out the join code above and
            students appear here as they enter it.
          </p>
        </div>
      )}

      {/* The scroll lives on the list, not the card, so the heading and the
          marking summary stay put while the names move under them. Fixed
          height rather than max-height: a section of five and a section of
          forty should not make the projects beside them jump around. */}
      {students.length > 0 && (
        <ul className="mt-3 h-72 divide-y divide-[var(--border-subtle)] overflow-y-auto pr-1">
          {students.map((s) => (
            <StudentRow key={s.id} student={s} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProjectsPanel({
  assignments,
  onCreateProject,
  onSeeAssignments,
}: Readonly<{
  assignments: Assignment[];
  onCreateProject: () => void;
  onSeeAssignments: () => void;
}>) {
  const ordered = useMemo(() => byDeadline(assignments), [assignments]);
  const nextDue = ordered.find(
    (a) => a.dueDate && new Date(a.dueDate).getTime() >= Date.now(),
  );

  let subtitle = "No deadlines set.";
  if (nextDue?.dueDate) {
    subtitle = `Next deadline: ${nextDue.title} — ${relativeDue(nextDue.dueDate)}`;
  }

  return (
    <section className="p-5">
      <SectionHeading
        title="Projects"
        subtitle={subtitle}
        // Only when projects exist — the empty state below carries its own
        // button, and two "Create project" buttons in one panel is one too many.
        action={
          ordered.length > 0 && (
            <Button size="sm" onClick={onCreateProject}>
              <span aria-hidden="true">＋</span> Create project
            </Button>
          )
        }
      />

      {ordered.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] p-5 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No projects in this section yet. Creating one generates a repository per
            student.
          </p>
          {/* Primary, not secondary: this is now the only way into project
              creation on Overview, so it should look like the thing to press. */}
          <Button size="sm" className="mt-3" onClick={onCreateProject}>
            <span aria-hidden="true">＋</span> Create project
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
            {ordered.slice(0, PROJECT_PREVIEW).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-[var(--text-strong)]">
                      {a.title}
                    </span>
                    {a.isGroup && <GenericPill tone="info">Group</GenericPill>}
                    {a.closedAt && <GenericPill tone="warning">Closed</GenericPill>}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {a.points} pts ·{" "}
                    {a.dueDate ? `Due ${formatDate(a.dueDate)}` : "No due date"}
                  </p>
                </div>
                {a.dueDate && (
                  <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">
                    {relativeDue(a.dueDate)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onSeeAssignments}
            className="mt-3 inline-flex items-center gap-1 rounded-md text-sm font-medium text-platform hover:underline"
          >
            All {ordered.length} {ordered.length === 1 ? "project" : "projects"} and
            submissions
            <span aria-hidden="true">→</span>
          </button>
        </>
      )}
    </section>
  );
}

export function ClassOverviewTab({
  info,
  roster,
  assignments,
  meetingLabs,
  onCreateProject,
  onSeeStudents,
  onSeeAssignments,
}: Readonly<{
  info: ClassCohort | undefined;
  roster: ClassRosterVM;
  assignments: ClassAssignmentsVM;
  meetingLabs: ClassMeetingLabsVM;
  onCreateProject: () => void;
  onSeeStudents: () => void;
  onSeeAssignments: () => void;
}>) {
  return (
    <div
      id="class-panel-overview"
      role="tabpanel"
      aria-labelledby="class-tab-overview"
      className="space-y-6"
    >
      {/* The laboratories button is withheld when the teacher holds courses in
          only one lab — there would be nothing to choose between. Creating a
          project moved into the Projects panel, next to what it creates. */}
      {info && meetingLabs.options.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 animate-fade-up">
          <MeetingLabsButton
            vm={meetingLabs}
            selected={info.meetingLabOrgIds ?? []}
            owningOrgId={info.orgId}
          />
        </div>
      )}

      {!roster.isLoading && !roster.error && roster.data && (
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--border-subtle)] bg-white p-5 shadow-card animate-fade-up sm:grid-cols-4">
          <Stat label="Students" value={roster.rollup.studentCount} tone="platform" />
          <Stat label="Submitted" value={roster.rollup.submitted} tone="warning" />
          <Stat label="Graded" value={roster.rollup.graded} tone="success" />
          <Stat
            label="Class avg"
            value={roster.rollup.classAvg !== null ? `${roster.rollup.classAvg}%` : "—"}
          />
        </div>
      )}

      {/* One container, two panels. The divider is horizontal when they stack
          on narrow screens and vertical once they sit side by side. */}
      <Card className="animate-fade-up">
        <div className="grid divide-y divide-[var(--border-subtle)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <StudentsPanel roster={roster} onSeeStudents={onSeeStudents} />
          <ProjectsPanel
            assignments={assignments.assignments}
            onCreateProject={onCreateProject}
            onSeeAssignments={onSeeAssignments}
          />
        </div>
      </Card>
    </div>
  );
}
