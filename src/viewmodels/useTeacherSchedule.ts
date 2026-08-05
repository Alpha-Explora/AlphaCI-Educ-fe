"use client";
// ============================================================================
// VIEWMODEL LAYER — the teacher's whole timetable, across every course.
//
// The Schedule tab answers three questions a teacher currently has to visit one
// course page at a time to answer: when does each of my sections meet, which one
// is running right now, and which of them are open for work outside their hours.
//
// It reads the SAME dashboard query the course board does, so the two screens
// can never disagree about which sections exist — and switching between them
// costs no fetch. Nothing here is a second source of truth; the derivation is the
// only thing this file adds.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useTeacherCourses } from "./useTeacherCourses";
import { useTeacherDashboard } from "./useTeacherDashboard";
import type { TeacherClass } from "./useTeacherCourseBoard";
import {
  describeSchedule,
  formatTime12,
  humaniseMinutes,
  isEnforceable,
  isInSession,
  minutesUntilClose,
  minutesUntilOpen,
  nextMeetingDay,
  nextOpeningTime,
} from "@/models/schedule";
import type { PresentableError } from "./errors";

/** Where a section sits relative to its own timetable, right now. */
export type SectionState =
  /** Inside its meeting window. */
  | "in-session"
  /** Outside the window, but the teacher has suspended the timetable. */
  | "outside-hours-open"
  /** Outside the window and closed to work. */
  | "closed"
  /** No timetable at all — always workable. */
  | "unscheduled";

export interface ScheduleRow {
  classInfo: TeacherClass;
  state: SectionState;
  /** "Programming 1" — the course this section belongs to, for its own column. */
  courseLabel: string;
  /** "CS-101 · A" — how a teacher refers to the section out loud. */
  sectionLabel: string;
  /** "Mon, Wed, Fri · 08:00–10:00", or null when unscheduled. */
  window: string | null;
  /** Human phrase for what happens next: "2 hours left", "Mon 08:00". */
  nextChange: string | null;
  /** Sort key — see the ordering note in the memo below. */
  sortKey: number;
}

/**
 * Copy and colour per state, in one place so two screens cannot describe the
 * same section differently. Read by the Schedule tab's table and by the Home
 * page's upcoming list.
 */
export const SECTION_STATE_LABEL: Record<
  SectionState,
  { text: string; tone: "success" | "warning" | "neutral" | "info" }
> = {
  "in-session": { text: "In session", tone: "success" },
  "outside-hours-open": { text: "Open after hours", tone: "warning" },
  closed: { text: "Closed", tone: "neutral" },
  unscheduled: { text: "No hours set", tone: "info" },
};

export interface TeacherScheduleVM {
  /** Every section, one row, already sorted by what happens soonest. */
  rows: ScheduleRow[];
  meetingNow: ScheduleRow[];
  totals: { sections: number; scheduled: number; outsideHoursOpen: number };
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;
}

export function useTeacherSchedule(
  teacherId: string | null,
  orgId?: string | null,
): TeacherScheduleVM {
  const coursesVm = useTeacherCourses(teacherId, orgId);
  const dash = useTeacherDashboard(teacherId, orgId);

  /*
    A minute tick, for the same reason the access card has one: this page is a
    wall-timetable a teacher leaves open, and a "meeting now" badge that only
    updates on reload is worse than no badge — it is confidently wrong.
  */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const classes = dash.data?.classes;
  const { courses } = coursesVm;

  /*
    Course titles by id AND by code, because a section's course may live in
    another lab and so have no local record by id — the same code-matching rule
    the course board uses, for the same reason: a teacher reads "Programming 1
    here" and "Programming 1 there" as one subject. Falling back to the section's
    own code means a row is never left with a blank Course cell.
  */
  const courseLabels = useMemo(() => {
    const byId = new Map(courses.map((c) => [c.id, c.title] as const));
    const byCode = new Map(
      courses.map((c) => [c.code.trim().toUpperCase(), c.title] as const),
    );
    return { byId, byCode };
  }, [courses]);

  const rows = useMemo<ScheduleRow[]>(() => {
    const built = (classes ?? []).map((classInfo) => {
      const schedule = classInfo.schedule;
      const scheduled = isEnforceable(schedule);
      const open = isInSession(schedule, now);

      let state: SectionState;
      if (!scheduled) state = "unscheduled";
      else if (open) state = "in-session";
      else if (classInfo.outsideHoursAllowed) state = "outside-hours-open";
      else state = "closed";

      let nextChange: string | null = null;
      if (scheduled && open) {
        const mins = minutesUntilClose(schedule, now);
        nextChange = mins === null ? null : `${humaniseMinutes(mins)} left`;
      } else if (scheduled) {
        const mins = minutesUntilOpen(schedule, now);
        nextChange =
          mins === null
            ? null
            : // Under an hour, the countdown is the useful form. Beyond that a
              // teacher wants the weekday — "in 3 days" does not say which.
              mins < 60
              ? `in ${humaniseMinutes(mins)}`
              : `${nextMeetingDay(schedule, now)} ${formatTime12(nextOpeningTime(schedule, now) ?? "")}`;
      }

      /*
        Ordering: what is happening NOW first, then what happens soonest, then
        the sections with no timetable at all.

        Deliberately not alphabetical. This page is read at a glance between
        classes, and the row that matters is almost always the one about to
        start — alphabetical would bury it under whatever section happens to
        begin with an A.
      */
      let sortKey: number;
      if (state === "in-session") sortKey = -1;
      else if (!scheduled) sortKey = Number.MAX_SAFE_INTEGER;
      else sortKey = minutesUntilOpen(schedule, now) ?? Number.MAX_SAFE_INTEGER - 1;

      const code = classInfo.code.trim().toUpperCase();
      const courseLabel =
        courseLabels.byId.get(classInfo.courseId) ??
        courseLabels.byCode.get(code) ??
        classInfo.code;

      return {
        classInfo,
        state,
        courseLabel,
        sectionLabel: `${classInfo.code} · ${classInfo.section}`,
        window: describeSchedule(schedule),
        nextChange,
        sortKey,
      };
    });

    return built.sort((a, b) => a.sortKey - b.sortKey);
  }, [classes, now, courseLabels]);

  /*
    NO GROUPING. This used to bucket rows into one card-grid per course, which a
    table makes redundant twice over: the course is a COLUMN now, and grouping
    would break the sort that gives the page its point — urgency first. Six
    courses meant six little tables, each internally ordered by "what's next" and
    none of them comparable with the others, which is the opposite of what a
    teacher opens a timetable to find out.
  */

  return {
    rows,
    meetingNow: rows.filter((r) => r.state === "in-session"),
    totals: {
      sections: rows.length,
      scheduled: rows.filter((r) => r.state !== "unscheduled").length,
      outsideHoursOpen: rows.filter((r) => r.classInfo.outsideHoursAllowed).length,
    },
    isLoading: coursesVm.isLoading || dash.isLoading,
    error: coursesVm.error ?? dash.error,
    refetch: () => {
      coursesVm.refetch();
      dash.refetch();
    },
  };
}
