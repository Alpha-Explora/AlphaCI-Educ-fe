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
  humaniseMinutes,
  isEnforceable,
  isInSession,
  minutesUntilClose,
  minutesUntilOpen,
  nextMeetingDay,
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
  /** "Mon, Wed, Fri · 08:00–10:00", or null when unscheduled. */
  window: string | null;
  /** Human phrase for what happens next: "2 hours left", "Mon 08:00". */
  nextChange: string | null;
  /** Sort key — see the ordering note in the memo below. */
  sortKey: number;
}

export interface ScheduleGroup {
  /** "IS-1234 — Programming 1", or the course code for a section from elsewhere. */
  label: string;
  courseId: string;
  rows: ScheduleRow[];
}

export interface TeacherScheduleVM {
  groups: ScheduleGroup[];
  /** Every row, flat — for the "meeting now" strip at the top. */
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
              : `${nextMeetingDay(schedule, now)} ${schedule?.startTime}`;
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

      return {
        classInfo,
        state,
        window: describeSchedule(schedule),
        nextChange,
        sortKey,
      };
    });

    return built.sort((a, b) => a.sortKey - b.sortKey);
  }, [classes, now]);

  /*
    Grouped by course for the body of the page, using the same code-matching rule
    as the course board: a section whose course lives in another lab still files
    under the matching local course, because a teacher reads "Programming 1 here"
    and "Programming 1 there" as one subject. Sections matching nothing fall into
    their own group keyed by course code rather than being dropped — a section
    missing from a timetable is the one bug this page cannot have.
  */
  const groups = useMemo<ScheduleGroup[]>(() => {
    const byCourseId = new Map<string, ScheduleRow[]>();
    const byCode = new Map<string, ScheduleRow[]>();

    const localCourseByCode = new Map(
      courses.map((c) => [c.code.trim().toUpperCase(), c] as const),
    );

    for (const row of rows) {
      const local = courses.find((c) => c.id === row.classInfo.courseId);
      if (local) {
        byCourseId.set(local.id, [...(byCourseId.get(local.id) ?? []), row]);
        continue;
      }
      const code = row.classInfo.code.trim().toUpperCase();
      const matched = localCourseByCode.get(code);
      if (matched) {
        byCourseId.set(matched.id, [...(byCourseId.get(matched.id) ?? []), row]);
      } else {
        byCode.set(code, [...(byCode.get(code) ?? []), row]);
      }
    }

    const fromCourses: ScheduleGroup[] = courses
      .map((course) => ({
        label: `${course.code} — ${course.title}`,
        courseId: course.id,
        rows: byCourseId.get(course.id) ?? [],
      }))
      .filter((g) => g.rows.length > 0);

    const orphans: ScheduleGroup[] = [...byCode.entries()].map(([code, list]) => ({
      label: code,
      courseId: `code:${code}`,
      rows: list,
    }));

    return [...fromCourses, ...orphans];
  }, [rows, courses]);

  return {
    groups,
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
