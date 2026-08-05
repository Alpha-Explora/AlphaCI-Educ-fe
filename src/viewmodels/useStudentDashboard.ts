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
import type { ClassAccessState, ClassCohort, StudentDashboard } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

type AssignmentRow = StudentDashboard["assignments"][number];

/** One class, with its own work. The unit the hub is now built from. */
export interface ClassSection {
  classInfo: ClassCohort;
  /**
   * Whether the class is accepting work right now, as the SERVER computed it.
   *
   * Read from the payload rather than derived from `classInfo.schedule` here: the
   * derivation would use the browser's clock, and the hub would then unlock a
   * class the API still refuses. Absent for a class the server sent no state for,
   * which is treated as open — the same fallback as having no schedule.
   */
  access: ClassAccessState | null;
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

/** A single repository is finished when it has been graded or archived. */
function repoIsPast(entry: AssignmentRow["repos"][number]): boolean {
  return entry.repo.status === "GRADED" || entry.repo.status === "ARCHIVED";
}

/**
 * Whether a project belongs in "Past" rather than in the student's to-do grid.
 *
 * TRIVIAL FOR ONE REPO, A REAL CHOICE FOR TWO. A SPLIT project has a backend and
 * a frontend that are graded independently, so "is this project finished" stops
 * being a lookup and becomes a rule — and the rule decides what a student is
 * told they still owe.
 *
 * `every` is the conservative reading: while either half is still open, the
 * project stays in the to-do grid. The alternative — `some`, i.e. one graded
 * half retires the card — would file a project as done while the student still
 * has a frontend to write, which is the one mistake this list must not make.
 *
 * An unprovisioned project (no repos at all) is NOT past. `every` on an empty
 * array is `true`, which would quietly hide brand-new work — the length guard is
 * the whole reason this is not a one-liner.
 */
function isPast(row: AssignmentRow): boolean {
  return row.repos.length > 0 && row.repos.every(repoIsPast);
}

export function useStudentDashboard(studentId: string | null): StudentDashboardVM {
  const query = useQuery({
    queryKey: queryKeys.dashboards.student(studentId ?? "none"),
    queryFn: () => dashboardsApi.student(studentId as string),
    enabled: Boolean(studentId),
    /*
      The payload now carries whether each class is workable RIGHT NOW
      (ClassAccessState.state), and a teacher pressing Start or End changes that
      for the whole room at once with nothing to push it to an open tab. 30s is
      the compromise: a student sees their class open within half a minute of the
      teacher starting it, while thirty tabs in a laboratory are not hammering
      the endpoint.
    */
    refetchInterval: 30_000,
    // The common shape of a lab session is "open the dashboard, work in VS Code
    // for twenty minutes, come back" — and the class may have ended in between.
    refetchOnWindowFocus: true,
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

    const accessByClass = new Map(
      (query.data?.access ?? []).map((state) => [state.classId, state]),
    );

    // Driven by `classes`, not by the assignments: a class a student has joined
    // but which has no work yet must still appear, or joining a class would
    // look like it silently failed.
    return classes.map((classInfo) => {
      const rowsForClass = byClass.get(classInfo.id) ?? [];
      return {
        classInfo,
        access: accessByClass.get(classInfo.id) ?? null,
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
