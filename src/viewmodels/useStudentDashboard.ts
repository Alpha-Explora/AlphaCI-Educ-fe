"use client";
// ============================================================================
// VIEWMODEL LAYER — Student assignment hub (multi-class, ADDENDUM D)
// Loads the student's dashboard, exposes every enrolled class, owns the
// selected-class filter, and derives the filtered active/past assignment
// lists. All filtering/splitting happens here — the View only renders.
// ============================================================================
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardsApi } from "@/models/api";
import type { ClassCohort, StudentDashboard } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

type AssignmentRow = StudentDashboard["assignments"][number];

export interface StudentDashboardVM {
  data: StudentDashboard | undefined;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  // multi-class course selector
  classes: ClassCohort[];
  /** null = "All classes". */
  selectedClassId: string | null;
  setSelectedClassId: (classId: string | null) => void;
  hasClasses: boolean;

  // assignments for the selected class (all classes when none selected)
  active: AssignmentRow[];
  past: AssignmentRow[];
  /** total rows for the current filter — drives the empty state. */
  visibleCount: number;
}

// "Past" = repo has been graded/archived; everything else is still active work.
function isPast(row: AssignmentRow): boolean {
  return row.repo?.status === "GRADED" || row.repo?.status === "ARCHIVED";
}

export function useStudentDashboard(studentId: string | null): StudentDashboardVM {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.dashboards.student(studentId ?? "none"),
    queryFn: () => dashboardsApi.student(studentId as string),
    enabled: Boolean(studentId),
  });

  const classes = query.data?.classes ?? [];

  // If the selected class disappears (e.g. after a refetch), fall back to All.
  const effectiveClassId =
    selectedClassId && classes.some((c) => c.id === selectedClassId)
      ? selectedClassId
      : null;

  const rows = useMemo<AssignmentRow[]>(() => {
    const all = query.data?.assignments ?? [];
    if (!effectiveClassId) return all;
    return all.filter((r) => r.classId === effectiveClassId);
  }, [query.data, effectiveClassId]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),

    classes,
    selectedClassId: effectiveClassId,
    setSelectedClassId,
    hasClasses: classes.length > 0,

    active: rows.filter((r) => !isPast(r)),
    past: rows.filter(isPast),
    visibleCount: rows.length,
  };
}
