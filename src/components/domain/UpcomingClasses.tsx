"use client";
// ============================================================================
// VIEW LAYER — what the teacher is teaching next, on Home.
//
// Home used to open on a grid of COURSE cards. A course is a catalogue entry —
// it does not start, end, or happen at a time — so the first thing a teacher saw
// on arriving at a laboratory was the one thing that could not tell them what was
// about to happen. The sections do, and they are what the day is made of.
//
// Soonest first, which is `useTeacherSchedule`'s own order. Deliberately NOT
// alphabetical and NOT grouped by course: the row that matters is the one about
// to start, and any other ordering buries it.
//
// This is the SHORT view. The Schedule tab is the full timetable with the
// outside-hours switches; this answers "what's next" and gets out of the way, so
// it carries no controls of its own beyond opening a section.
// ============================================================================
import Link from "next/link";
import { Card, GenericPill, cn } from "@/components/ui";
import {
  SECTION_STATE_LABEL,
  type ScheduleRow,
} from "@/viewmodels/useTeacherSchedule";

export function UpcomingClasses({ rows }: { readonly rows: ScheduleRow[] }) {
  return (
    <Card className="divide-y divide-[var(--border-subtle)] overflow-hidden p-0">
      {rows.map((row) => (
        <UpcomingRow key={row.classInfo.id} row={row} />
      ))}
    </Card>
  );
}

function UpcomingRow({ row }: { readonly row: ScheduleRow }) {
  const { classInfo, state, courseLabel, sectionLabel, window: meetingWindow, nextChange } =
    row;
  const badge = SECTION_STATE_LABEL[state];
  const live = state === "in-session";

  return (
    <Link
      href={`/teacher/classes/${classInfo.id}`}
      className={cn(
        "group flex items-center gap-4 px-5 py-4 transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-platform",
        live ? "bg-emerald-50/70 hover:bg-emerald-50" : "hover:bg-slate-50/70",
      )}
    >
      {/* WHEN, first and in its own column. A schedule is read down this edge —
          "what is happening, and when" — so it gets the left rail rather than
          being a detail inside the section's name. */}
      <div className="w-24 shrink-0">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            live ? "text-emerald-700" : "text-[var(--text-strong)]",
          )}
        >
          {live ? "Now" : (nextChange ?? "Any time")}
        </p>
        {live && nextChange && (
          <p className="text-xs text-emerald-700/80">{nextChange}</p>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--text-strong)]">{sectionLabel}</span>
          <GenericPill tone={badge.tone} dot={live}>
            {badge.text}
          </GenericPill>
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {courseLabel}
          {meetingWindow ? ` · ${meetingWindow}` : ""}
        </p>
      </div>

      <span
        aria-hidden="true"
        className="shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
