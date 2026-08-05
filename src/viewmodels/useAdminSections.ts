"use client";
// ============================================================================
// VIEWMODEL LAYER — every section in a laboratory, for the admin who owns them.
//
// The admin creates sections and books their hours, so they also have to be able
// to see and change them afterwards. This is that list: what exists, when it
// meets, and the two mutations an admin needs — re-book its hours, or remove it.
//
// Sections come from `classesApi.list({ orgId })`, which returns everything
// reachable from the lab: owned by it, or merely meeting in it. That is wider
// than "owned here" on purpose — a section the admin can see on the timetable is
// one they must be able to fix.
// ============================================================================
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classesApi } from "@/models/api";
import type { ClassCohort, ClassSchedule } from "@/models/types";
import { describeSchedule, isEnforceable } from "@/models/schedule";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface AdminSectionRow {
  classInfo: ClassCohort;
  /** "AT-1234 · A" */
  label: string;
  /** "Mon, Wed · 8am–10am", or null when it has no hours yet. */
  window: string | null;
}

export interface AdminSectionsVM {
  sections: AdminSectionRow[];
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  setHours: (classId: string, schedule: ClassSchedule[] | null) => void;
  isSavingHours: boolean;
  hoursError: PresentableError | null;
  resetHours: () => void;

  remove: (classId: string) => void;
  isRemoving: boolean;
  removingId: string | null;
  removeError: PresentableError | null;
}

export function useAdminSections(orgId: string | null): AdminSectionsVM {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.classes.list({ orgId: orgId ?? undefined }),
    queryFn: () => classesApi.list({ orgId: orgId as string }),
    enabled: Boolean(orgId),
  });

  /*
    Both mutations invalidate everything. A section's hours decide what every
    other screen shows — the teacher's timetable, the student's card state, the
    conflict grid the admin is looking at — and a narrower key would leave one of
    them confidently wrong.
  */
  const invalidateAll = () => void queryClient.invalidateQueries();

  const hoursMutation = useMutation({
    mutationFn: ({
      classId,
      schedule,
    }: {
      classId: string;
      schedule: ClassSchedule[] | null;
    }) =>
      classesApi.setSchedule(classId, schedule),
    onSuccess: invalidateAll,
  });

  const removeMutation = useMutation({
    mutationFn: (classId: string) => classesApi.remove(classId),
    onSuccess: invalidateAll,
  });

  const sections = useMemo<AdminSectionRow[]>(() => {
    const rows = (query.data ?? []).map((classInfo) => ({
      classInfo,
      label: `${classInfo.code} · ${classInfo.section}`,
      window: isEnforceable(classInfo.schedule)
        ? describeSchedule(classInfo.schedule)
        : null,
    }));
    // Unscheduled last: they are the ones needing attention, but they sort
    // nowhere sensible among real times, so they go in their own block.
    return rows.sort((a, b) => {
      if (!a.window && b.window) return 1;
      if (a.window && !b.window) return -1;
      return a.label.localeCompare(b.label);
    });
  }, [query.data]);

  return {
    sections,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),

    setHours: (classId, schedule) => hoursMutation.mutate({ classId, schedule }),
    isSavingHours: hoursMutation.isPending,
    hoursError: hoursMutation.error ? toPresentableError(hoursMutation.error) : null,
    resetHours: () => hoursMutation.reset(),

    remove: (classId) => removeMutation.mutate(classId),
    isRemoving: removeMutation.isPending,
    removingId: removeMutation.variables ?? null,
    removeError: removeMutation.error ? toPresentableError(removeMutation.error) : null,
  };
}
