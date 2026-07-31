"use client";
// ============================================================================
// VIEW LAYER — the Overview tab of a class section.
//
// Overview answers three questions, in the order a teacher asks them: what can
// I DO here, how is the class DOING, and what is COMING UP. It previously
// answered none of them — four numbers and two buttons, which is why the tab
// looked unfinished next to the roster beside it.
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
  Stat,
} from "@/components/ui";
import { formatDate, relativeDue } from "@/components/ui/format";
import { JoinCodeStrip } from "./JoinCodeButton";
import { MeetingLabsButton } from "./MeetingLabsButton";

type RosterStudent = ClassRoster["students"][number];

/** How many projects fit before the list stops being a summary. */
const PROJECT_PREVIEW = 4;
/** Same, for the names of students who have submitted nothing. */
const NAME_PREVIEW = 6;

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

function MarkingProgressCard({
  rollup,
  notStarted,
  onSeeStudents,
}: Readonly<{
  rollup: ClassRosterVM["rollup"];
  notStarted: RosterStudent[];
  onSeeStudents: () => void;
}>) {
  const awaiting = Math.max(rollup.submitted - rollup.graded, 0);

  return (
    <Card className="p-5 animate-fade-up">
      <SectionHeading
        title="Marking progress"
        subtitle="Where this section stands right now."
      />

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-[var(--text-strong)]">
              Submissions marked
            </span>
            <span className="tabular-nums text-[var(--text-muted)]">
              {rollup.graded} of {rollup.submitted}
            </span>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={rollup.graded}
            // A zero denominator would render a full bar, which is the most
            // flattering possible lie about a class that has submitted nothing.
            max={Math.max(rollup.submitted, 1)}
            tone={awaiting === 0 ? "success" : "warning"}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-[var(--text-strong)]">Class average</span>
            <span className="tabular-nums text-[var(--text-muted)]">
              {rollup.classAvg !== null ? `${rollup.classAvg}%` : "Nothing marked yet"}
            </span>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={rollup.classAvg ?? 0}
            tone={(rollup.classAvg ?? 0) >= 60 ? "platform" : "warning"}
          />
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-4 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Waiting to be marked</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--text-strong)]">
              {awaiting}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Nothing submitted yet</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--text-strong)]">
              {notStarted.length}
              <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">
                {notStarted.length === 1 ? "student" : "students"}
              </span>
            </dd>
          </div>
        </dl>

        {/* Names, not just a count: "4 students" is a statistic, four names are
            something a teacher can act on this afternoon. */}
        {notStarted.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {notStarted.slice(0, NAME_PREVIEW).map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2.5 text-xs text-[var(--text-strong)]"
              >
                <Avatar name={s.fullName} color={s.avatarColor} size="sm" />
                {s.fullName}
              </span>
            ))}
            {notStarted.length > NAME_PREVIEW && (
              <button
                type="button"
                onClick={onSeeStudents}
                className="rounded-md text-xs font-medium text-platform hover:underline"
              >
                +{notStarted.length - NAME_PREVIEW} more →
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ProjectsCard({
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
    <Card className="p-5 animate-fade-up">
      <SectionHeading title="Projects" subtitle={subtitle} />

      {ordered.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] p-5 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No projects in this section yet. Creating one generates a repository per
            student.
          </p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={onCreateProject}>
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
    </Card>
  );
}

export function ClassOverviewTab({
  classId,
  info,
  roster,
  assignments,
  meetingLabs,
  onCreateProject,
  onSeeStudents,
  onSeeAssignments,
}: Readonly<{
  classId: string | null;
  info: ClassCohort | undefined;
  roster: ClassRosterVM;
  assignments: ClassAssignmentsVM;
  meetingLabs: ClassMeetingLabsVM;
  onCreateProject: () => void;
  onSeeStudents: () => void;
  onSeeAssignments: () => void;
}>) {
  const students = roster.data?.students ?? [];
  const notStarted = students.filter((s) => s.submittedCount === 0);

  return (
    <div
      id="class-panel-overview"
      role="tabpanel"
      aria-labelledby="class-tab-overview"
      className="space-y-6"
    >
      {/* The laboratories button is withheld when the teacher holds courses in
          only one lab — there would be nothing to choose between. */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-up">
        <Button onClick={onCreateProject}>
          <span aria-hidden="true">＋</span> Create project
        </Button>
        {info && meetingLabs.options.length > 1 && (
          <MeetingLabsButton
            vm={meetingLabs}
            selected={info.meetingLabOrgIds ?? []}
            owningOrgId={info.orgId}
          />
        )}
      </div>

      {/* On the page rather than behind a click: reading the code out is the
          thing teachers actually do with it. See JoinCodeStrip. */}
      {classId && <JoinCodeStrip classId={classId} />}

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

      <div className="grid gap-5 lg:grid-cols-2">
        <MarkingProgressCard
          rollup={roster.rollup}
          notStarted={notStarted}
          onSeeStudents={onSeeStudents}
        />
        <ProjectsCard
          assignments={assignments.assignments}
          onCreateProject={onCreateProject}
          onSeeAssignments={onSeeAssignments}
        />
      </div>
    </div>
  );
}
