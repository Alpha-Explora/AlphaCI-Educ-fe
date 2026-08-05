"use client";
// ============================================================================
// VIEWMODEL LAYER — Class access, TEACHER side ("the code on the board").
//
// Owns the code panel on the teacher dashboard: starting the class, the code
// itself, who has arrived, rotating a leaked code, and ending the class.
//
// Distinct from useJoinCode, which manages the ENROLMENT code. Both live on the
// teacher's screens and they are easy to confuse — the rule of thumb is that
// useJoinCode builds the roster, this one opens the door.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classAccessApi } from "@/models/api";
import type { ClassAccessStatus } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

/**
 * How often the arrivals list refreshes while a class is open.
 *
 * 8 seconds, and only while OPEN. A teacher watches this list fill up at the
 * start of a class to see who is in — a stale count is the failure mode that
 * matters, since it reads as "the code isn't working" and invites them to rotate
 * a code that was fine. Polling stops when the class is closed, where there is
 * nothing to watch and nothing changes until they press Start.
 */
const ARRIVALS_POLL_MS = 8_000;

export interface ClassAccessVM {
  data: ClassAccessStatus | undefined;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  /** true while a session is running — the code is live. */
  isOpen: boolean;
  /** The code to put on the screen, or null when the class is closed. */
  code: string | null;
  /** How many students have typed it. */
  admittedCount: number;

  open: () => void;
  isOpening: boolean;
  rotate: () => void;
  isRotating: boolean;
  end: () => void;
  isEnding: boolean;

  /** true while this section's timetable is suspended (asynchronous work). */
  outsideHoursAllowed: boolean;
  setOutsideHours: (allowed: boolean) => void;
  isSettingOutsideHours: boolean;

  /** Whichever mutation failed last, ready to render. */
  actionError: PresentableError | null;
}

export function useClassAccess(classId: string | null): ClassAccessVM {
  const queryClient = useQueryClient();
  const key = queryKeys.classAccess.forClass(classId ?? "none");

  const query = useQuery({
    queryKey: key,
    queryFn: () => classAccessApi.status(classId as string),
    enabled: Boolean(classId),
    refetchInterval: (q) => (q.state.data?.open ? ARRIVALS_POLL_MS : false),
  });

  /**
   * Every mutation returns the fresh status, so it is written straight into the
   * cache instead of only invalidating.
   *
   * That matters more here than in most panels: the teacher is reading the code
   * out loud, and a refetch round-trip is a window in which the card shows the
   * OLD code (or none at all) while the room is already typing. Writing first and
   * invalidating after means the displayed code changes exactly when the server
   * says it did.
   */
  const applyStatus = (fresh: ClassAccessStatus) => {
    queryClient.setQueryData<ClassAccessStatus>(key, fresh);
    void queryClient.invalidateQueries({ queryKey: key });
  };

  const openMutation = useMutation({
    mutationFn: () => classAccessApi.open(classId as string),
    onSuccess: applyStatus,
  });

  const rotateMutation = useMutation({
    mutationFn: () => classAccessApi.rotate(classId as string),
    onSuccess: applyStatus,
  });

  const endMutation = useMutation({
    mutationFn: () => classAccessApi.end(classId as string),
    onSuccess: (fresh) => {
      applyStatus(fresh);
      // Ending a class clears outsideHoursAllowed on the class record too, so the
      // Schedule tab's rows are now stale. It reads classes from the teacher
      // dashboard, not from here.
      void queryClient.invalidateQueries({ queryKey: ["dashboards", "teacher"] });
    },
  });

  const outsideHoursMutation = useMutation({
    mutationFn: (allowed: boolean) =>
      classAccessApi.setOutsideHours(classId as string, allowed),
    onSuccess: (fresh) => {
      applyStatus(fresh);
      // Same reason as above: the flag lives on the class record, which the
      // Schedule tab renders from the dashboard query.
      void queryClient.invalidateQueries({ queryKey: ["dashboards", "teacher"] });
    },
  });

  const firstError =
    outsideHoursMutation.error ??
    endMutation.error ??
    rotateMutation.error ??
    openMutation.error ??
    null;

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),

    isOpen: Boolean(query.data?.open),
    code: query.data?.code ?? null,
    admittedCount: query.data?.admitted.length ?? 0,

    open: () => openMutation.mutate(),
    isOpening: openMutation.isPending,
    rotate: () => rotateMutation.mutate(),
    isRotating: rotateMutation.isPending,
    end: () => endMutation.mutate(),
    isEnding: endMutation.isPending,

    outsideHoursAllowed: Boolean(query.data?.outsideHoursAllowed),
    setOutsideHours: (allowed: boolean) => outsideHoursMutation.mutate(allowed),
    isSettingOutsideHours: outsideHoursMutation.isPending,

    actionError: firstError ? toPresentableError(firstError) : null,
  };
}
