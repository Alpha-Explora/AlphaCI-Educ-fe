"use client";
// ============================================================================
// VIEW LAYER — Schedule: every section this teacher runs, and when.
//
// The one screen that answers "what am I teaching, and when" without opening a
// course at a time. Before this, a section's meeting window lived only on that
// section's own Settings tab, so a teacher with six sections had six pages to
// visit to see their week — and no way at all to see which one was running now.
//
// A CALENDAR, THEN A TABLE — and both earn their place.
//
// The calendar answers "what does my week actually look like": it expands each
// section's weekly rule onto real days, so a clash or a heavy Thursday is seen
// rather than worked out. The table answers "what is the state of each section",
// which a grid cannot do — a status, a countdown and a switch do not fit in a
// day cell, and squeezing them there would cost the calendar the thing it is
// good at.
//
// The table is deliberately NOT grouped per course: grouping would break the
// sort that gives it its point — soonest first — leaving several little tables
// each ordered internally and none comparable. The course is a column instead.
//
// PHILIPPINE TIME, SAID ONCE. Every window here is Asia/Manila regardless of the
// teacher's laptop clock. Repeating that on every row would be noise; omitting it
// is how a teacher on a mis-set laptop misreads their whole timetable. So it is
// stated once, above the table it governs.
//
// Derivation lives in useTeacherSchedule; this file is layout.
// ============================================================================
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import {
  SECTION_STATE_LABEL,
  useTeacherSchedule,
  type ScheduleRow,
} from "@/viewmodels/useTeacherSchedule";
import { OutsideHoursToggle } from "@/components/domain/OutsideHoursToggle";
import { ScheduleCalendar } from "@/components/domain/ScheduleCalendar";
import {
  Card,
  EmptyState,
  GenericPill,
  Skeleton,
  Stat,
  StateBoundary,
  cn,
} from "@/components/ui";

export default function TeacherSchedulePage() {
  const { user, selectedOrgId } = useSession();
  const vm = useTeacherSchedule(user?.id ?? null, selectedOrgId);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Schedule</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            When each of your sections meets, and whether students can work on its
            projects right now. Your IT admin sets these hours. All times are{" "}
            <span className="font-medium text-[var(--text-strong)]">
              Philippine time.
            </span>
          </p>
        </div>

        {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
          <div className="grid grid-cols-3 gap-6 rounded-xl border border-[var(--border-subtle)] bg-white px-5 py-4 shadow-card">
            <Stat label="Sections" value={vm.totals.sections} tone="platform" />
            <Stat label="Meeting now" value={vm.meetingNow.length} tone="success" />
            <Stat
              label="Open after hours"
              value={vm.totals.outsideHoursOpen}
              tone={vm.totals.outsideHoursOpen > 0 ? "warning" : undefined}
            />
          </div>
        )}
      </header>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        isEmpty={vm.rows.length === 0}
        emptyFallback={
          <EmptyState
            icon="🗓️"
            title="No sections yet"
            description="Once you create a class section under one of your courses, its meeting hours appear here."
          />
        }
        loadingFallback={<Skeleton className="h-72 w-full rounded-xl" />}
      >
        <div className="space-y-8 animate-fade-up">
          <ScheduleCalendar rows={vm.rows} />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              Sections
            </h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <caption className="sr-only">
                  Your class sections, soonest first. Each row shows when the section
                  meets, whether it is running now, and whether students may work on it
                  outside those hours.
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-slate-50/70 text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Section
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Course
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Meets
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Next
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Outside hours
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {vm.rows.map((row) => (
                    <ScheduleTableRow key={row.classInfo.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/*
            The footnote the rows no longer carry. Stated once because it is the
            same sentence for every section, and thirty copies of it is how a
            table stops being scannable.
          */}
          <p className="max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-strong)]">Outside hours</span>{" "}
            lets students work on a section&apos;s projects at any time, not only during
            the hours above. They still need the class code — switching it on opens the
            class so there is one to give them. Ending a class on Home turns it back off
            and signs everyone out.
          </p>
          </div>
        </div>
      </StateBoundary>
    </div>
  );
}

function ScheduleTableRow({ row }: { readonly row: ScheduleRow }) {
  const { classInfo, state, courseLabel, sectionLabel, window: meetingWindow, nextChange } =
    row;
  const badge = SECTION_STATE_LABEL[state];

  /*
    CLOSED SECTIONS ARE GREYED. Nobody can work on them right now, so they are
    background information — the rows that matter are the ones a student could be
    touching this minute. Greying them is what lets the live rows be found without
    reading the Status column.

    Muting is applied to the TEXT, not as an `opacity` on the whole row. Two
    reasons, and the second is the important one: opacity would also fade the
    status pill (the one thing explaining WHY the row is grey), and it would fade
    the outside-hours switch — an interactive control that is still perfectly
    usable here, and which greying would falsely read as disabled. Turning that
    switch on is the main reason a teacher visits a closed row at all.
  */
  const muted = state === "closed";

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-slate-50/60",
        /*
          A tinted row rather than only a pill: the live section is what the page
          is opened to find, and it should be locatable without reading a column.

          Emerald palette, NOT `success/5`. The `success` token is a hex CSS
          variable mapped without an `<alpha-value>` slot, so every `/opacity`
          variant on it compiles to nothing at all — a tint that silently does not
          exist. Tailwind's own palette colours take modifiers fine.
        */
        state === "in-session" && "bg-emerald-50/70",
        muted && "bg-slate-50/40",
      )}
    >
      <th scope="row" className="px-4 py-3 text-left font-normal">
        <div className="flex items-center gap-2.5">
          {state === "in-session" && (
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-success"
            />
          )}
          <div className="min-w-0">
            <p
              className={cn(
                "font-medium",
                muted ? "text-[var(--text-muted)]" : "text-[var(--text-strong)]",
              )}
            >
              {sectionLabel}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">{classInfo.name}</p>
          </div>
        </div>
      </th>

      <td className="px-4 py-3 text-[var(--text-muted)]">{courseLabel}</td>

      <td className="px-4 py-3">
        {meetingWindow ? (
          <span
            className={cn(
              "tabular-nums",
              muted ? "text-[var(--text-muted)]" : "text-[var(--text-strong)]",
            )}
          >
            {meetingWindow}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">Any time</span>
        )}
      </td>

      <td className="px-4 py-3">
        <GenericPill tone={badge.tone}>{badge.text}</GenericPill>
      </td>

      <td className="px-4 py-3 tabular-nums text-[var(--text-muted)]">
        {nextChange ?? "—"}
      </td>

      <td className="px-4 py-3">
        {/* Only meaningful for a section that HAS hours — there is nothing to
            suspend on one that is already always open, and offering the switch
            there would imply the opposite. */}
        {state === "unscheduled" ? (
          <span className="text-xs text-[var(--text-muted)]">—</span>
        ) : (
          <OutsideHoursToggle classId={classInfo.id} sectionLabel={sectionLabel} />
        )}
      </td>

      <td className="px-4 py-3 text-right">
        {/* Straight to where the window is edited. The schedule is set on the
            section's own Settings tab and stays there — a second editor here
            would be two forms writing one field. */}
        <Link
          href={`/teacher/classes/${classInfo.id}`}
          className="whitespace-nowrap text-xs font-medium text-platform underline underline-offset-2 hover:text-platform-700"
        >
          Open
        </Link>
      </td>
    </tr>
  );
}
