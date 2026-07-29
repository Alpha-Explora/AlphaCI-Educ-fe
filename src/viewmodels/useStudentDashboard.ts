"use client";
// ============================================================================
// VIEWMODEL LAYER — Student assignment hub (multi-class, ADDENDUM D)
//
// Loads the student's dashboard and groups it into ONE SECTION PER CLASS.
//
// This replaced a tab strip ("All classes · IS-1234 · …") that filtered a
// single flat list. The tabs were a poor trade for a student: the default view
// was "All", so the tabs did nothing until pressed, and pressing one HID the
// other classes — a student with three subjects had to click through three
// times to answer "what do I owe this week?". Sections answer it by scrolling.
//
// It also matched the wrong mental model. A student holds exactly one class per
// course, so "course" and "class" are the same thing to them; a control for
// choosing between them implied a distinction they do not have.
//
// The View renders these sections and nothing else — the grouping, the
// active/past split and the ordering all happen here.
// ============================================================================
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardsApi } from "@/models/api";
import type { ClassCohort, StudentDashboard } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

type AssignmentRow = StudentDashboard["assignments"][number];

/** One class, with its own work. The unit the hub is now built from. */
export interface ClassSection {
  classInfo: ClassCohort;
  /** Still to do, or done but not yet graded. */
  active: AssignmentRow[];
  /** Graded or archived — kept, but out of the way. */
  past: AssignmentRow[];
  /** active + past, so the View can render an empty class honestly. */
  total: number;
}

export interface StudentDashboardVM {
  data: StudentDashboard | undefined;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  /** One entry per enrolled class, in the order the API returned them. */
  sections: ClassSection[];
  hasClasses: boolean;
  /** Every assignment across every class — drives the page-level empty state. */
  totalAssignments: number;
}

// "Past" = repo has been graded/archived; everything else is still active work.
function isPast(row: AssignmentRow): boolean {
  return row.repo?.status === "GRADED" || row.repo?.status === "ARCHIVED";
}

export function useStudentDashboard(studentId: string | null): StudentDashboardVM {
  const query = useQuery({
    queryKey: queryKeys.dashboards.student(studentId ?? "none"),
    queryFn: () => dashboardsApi.student(studentId as string),
    enabled: Boolean(studentId),
  });

  const sections = useMemo<ClassSection[]>(() => {
    const classes = query.data?.classes ?? [];
    const rows = query.data?.assignments ?? [];

    // Bucket once by classId rather than filtering the list per class, so a
    // student with many classes doesn't pay a full scan for each one.
    const byClass = new Map<string, AssignmentRow[]>();
    for (const row of rows) {
      const bucket = byClass.get(row.classId);
      if (bucket) bucket.push(row);
      else byClass.set(row.classId, [row]);
    }

    // Driven by `classes`, not by the assignments: a class a student has joined
    // but which has no work yet must still appear, or joining a class would
    // look like it silently failed.
    return classes.map((classInfo) => {
      const rowsForClass = byClass.get(classInfo.id) ?? [];
      return {
        classInfo,
        active: rowsForClass.filter((r) => !isPast(r)),
        past: rowsForClass.filter(isPast),
        total: rowsForClass.length,
      };
    });
  }, [query.data]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),

    sections,
    hasClasses: sections.length > 0,
    totalAssignments: query.data?.assignments.length ?? 0,
  };
}
