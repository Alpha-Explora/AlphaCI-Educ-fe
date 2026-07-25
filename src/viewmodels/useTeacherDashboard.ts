"use client";
// VIEWMODEL LAYER — Teacher dashboard.
// Fetches the teacher's class groups and derives summary totals for the header.
import { useQuery } from "@tanstack/react-query";
import { dashboardsApi } from "@/models/api";
import type { TeacherDashboard } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface TeacherDashboardVM {
  data: TeacherDashboard | undefined;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;
  // derived presentation totals
  totals: {
    classes: number;
    students: number;
    pendingGrading: number;
  };
}

// ADDENDUM K — `orgId` scopes the class list/totals to the selected lab.
export function useTeacherDashboard(
  teacherId: string | null,
  orgId?: string | null,
): TeacherDashboardVM {
  const query = useQuery({
    queryKey: queryKeys.dashboards.teacher(teacherId ?? "none", orgId ?? undefined),
    queryFn: () => dashboardsApi.teacher(teacherId as string, orgId ?? undefined),
    enabled: Boolean(teacherId),
  });

  const classes = query.data?.classes ?? [];
  const totals = {
    classes: classes.length,
    students: classes.reduce((sum, c) => sum + c.studentCount, 0),
    pendingGrading: classes.reduce((sum, c) => sum + c.pendingGrading, 0),
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),
    totals,
  };
}
