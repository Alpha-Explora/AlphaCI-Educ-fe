"use client";
// ============================================================================
// VIEWMODEL LAYER — Student: Report.
//
// Answers the two questions a student opens a report with, in this order:
// "how am I doing?" and "what do I still owe?". Everything below exists to
// serve one of those; nothing here is a statistic for its own sake.
//
// BUILT ON THE DASHBOARD PAYLOAD ALREADY LOADED BY THE HUB. No new endpoint and
// no extra request — react-query serves both pages from one cache entry under
// the same key, so opening the report costs nothing a student has not already
// paid for.
//
// ── THE RULE THIS FILE IS MOST EASILY GOT WRONG BY ─────────────────────────
//
// A mark the teacher has not published must not appear, and the server enforces
// that: for a student viewer it blanks `repo.grade`, `teacherFeedback`,
// `gradedAt` and `latestRun.score` on any assignment without a release stamp
// (see the backend's common/grade-visibility.util.ts).
//
// So a null grade here means one of TWO different things, and the page must not
// collapse them:
//
//   status GRADED + grade null  -> marked, but your teacher has not published it
//   anything else + grade null  -> not marked yet
//
// `status` survives redaction, which is what lets the distinction be drawn at
// all. Telling a student "your work is marked, the number is coming" is honest
// and useful; showing "—" for both is not.
//
// AVERAGES COUNT PUBLISHED MARKS ONLY. Treating a withheld mark as zero would
// invent a failing average out of work that may be full marks, and skipping the
// row entirely without saying so would leave a student wondering why a project
// they know is finished is missing from the total.
// ============================================================================
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardsApi } from "@/models/api";
import {
  markOutOf,
  markStateOf,
  publishedAverage,
  type MarkState,
} from "@/models/marks";
import type {
  Assignment,
  ClassCohort,
  StudentDashboard,
  StudentDashboardRepo,
} from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export type { MarkState };

/** One repository's line on the report. A SPLIT project contributes two. */
export interface MarkRow {
  repoId: string;
  /** "Backend" / "Frontend", or null on a project with a single repository. */
  half: string | null;
  state: MarkState;
  /** Only ever set when state is PUBLISHED. */
  grade: number | null;
  /** THIS REPOSITORY's share of the project's points — half of it on a SPLIT. */
  outOf: number;
  submitted: boolean;
}

export interface ProjectRow {
  assignment: Assignment;
  className: string;
  rows: MarkRow[];
  /** Provisioned but untouched work is what the "still to do" list is built of. */
  anyOutstanding: boolean;
}

export interface ClassReportSection {
  classInfo: ClassCohort;
  projects: ProjectRow[];
  /** Percent across this class's PUBLISHED marks only. Null when it has none. */
  average: number | null;
  publishedCount: number;
}

export interface StudentReportVM {
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  sections: ClassReportSection[];
  /** Percent across every published mark in every class. Null when none exist. */
  overallAverage: number | null;
  totals: {
    classes: number;
    projects: number;
    submitted: number;
    published: number;
    awaitingRelease: number;
  };
  /** Projects with work still open, newest class first. Drives "what to do next". */
  outstanding: ProjectRow[];
  hasAnything: boolean;
}

const HALF_LABEL: Record<string, string> = {
  BACKEND: "Backend",
  FRONTEND: "Frontend",
};

function toMarkRow(entry: StudentDashboardRepo, assignment: Assignment): MarkRow {
  const component = entry.repo.component;
  return {
    repoId: entry.repo.id,
    // A SINGLE project's one repository gets no label — "Single" beside a lone
    // row is noise, and the absent `component` on pre-split rows means the same
    // thing.
    half: component && component !== "SINGLE" ? (HALF_LABEL[component] ?? component) : null,
    state: markStateOf(entry.repo),
    grade: entry.repo.grade,
    outOf: markOutOf(assignment),
    submitted: entry.repo.submittedAt !== null,
  };
}

export function useStudentReport(studentId: string | null): StudentReportVM {
  const query = useQuery({
    // The hub's key, deliberately. Two pages reading one cache entry cannot
    // disagree about what a student's marks are.
    queryKey: queryKeys.dashboards.student(studentId ?? "none"),
    queryFn: () => dashboardsApi.student(studentId as string),
    enabled: Boolean(studentId),
  });

  return useMemo<StudentReportVM>(() => {
    const data: StudentDashboard | undefined = query.data;
    const classes = data?.classes ?? [];
    const assignmentRows = data?.assignments ?? [];

    const byClass = new Map<string, typeof assignmentRows>();
    for (const row of assignmentRows) {
      const bucket = byClass.get(row.classId);
      if (bucket) bucket.push(row);
      else byClass.set(row.classId, [row]);
    }

    // Driven by `classes`, not by the work: a class a student joined that has no
    // projects yet must still appear, or joining looks like it silently failed.
    const sections: ClassReportSection[] = classes.map((classInfo) => {
      const projects: ProjectRow[] = (byClass.get(classInfo.id) ?? []).map((row) => {
        const rows = row.repos.map((entry) => toMarkRow(entry, row.assignment));
        return {
          assignment: row.assignment,
          className: row.className,
          rows,
          // An unprovisioned project has no repositories at all and is still
          // outstanding — `some` on an empty array is false, so the length check
          // is doing real work here rather than guarding a nicety.
          anyOutstanding:
            rows.length === 0 || rows.some((r) => r.state !== "PUBLISHED" && !r.submitted),
        };
      });

      const allRows = projects.flatMap((p) => p.rows);
      return {
        classInfo,
        projects,
        average: publishedAverage(allRows),
        publishedCount: allRows.filter((r) => r.state === "PUBLISHED").length,
      };
    });

    const everyRow = sections.flatMap((s) => s.projects.flatMap((p) => p.rows));

    return {
      isLoading: query.isLoading,
      error: query.error ? toPresentableError(query.error) : null,
      refetch: () => void query.refetch(),

      sections,
      overallAverage: publishedAverage(everyRow),
      totals: {
        classes: classes.length,
        projects: assignmentRows.length,
        submitted: everyRow.filter((r) => r.submitted).length,
        published: everyRow.filter((r) => r.state === "PUBLISHED").length,
        awaitingRelease: everyRow.filter((r) => r.state === "AWAITING_RELEASE").length,
      },
      outstanding: sections.flatMap((s) => s.projects.filter((p) => p.anyOutstanding)),
      hasAnything: assignmentRows.length > 0,
    };
  }, [query]);
}
