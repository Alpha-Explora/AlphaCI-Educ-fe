"use client";
// ============================================================================
// VIEWMODEL LAYER — the IT admin creates a section and books its slot.
//
// Replaced useCreateClass, which was the teacher's own "Create class". The
// timetable books a PERSON and a ROOM, so it is not one teacher's setting: with
// teachers creating their own sections nothing could see the whole timetable at
// the moment of the decision, and two classes in one laboratory at one hour was
// not a rule anyone broke — it was a state nobody could observe.
//
// TWO SERVER CALLS, ONE RULE. `check` previews conflicts as the admin picks and
// `create` refuses them on save. Both run the same ScheduleConflictService on
// the server, so the preview cannot promise a slot the save then denies.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classesApi } from "@/models/api";
import type {
  ClassCohort,
  ClassSchedule,
  CreateClassInput,
  ScheduleBooking,
  ScheduleConflict,
} from "@/models/types";
import { toPresentableError, type PresentableError } from "./errors";

export interface AdminCreateSectionVM {
  create: (input: CreateClassInput) => void;
  isCreating: boolean;
  createError: PresentableError | null;
  createdClass: ClassCohort | null;
  reset: () => void;

  /** Preview conflicts for a slot. Safe to call on every keystroke. */
  check: (input: {
    schedule: ClassSchedule;
    classId?: string;
    teacherId?: string;
    labOrgIds?: string[];
  }) => void;
  conflicts: ScheduleConflict[];
  isChecking: boolean;

  /** What the teacher and rooms already have booked — the grid's shading. */
  bookings: ScheduleBooking[];
  isLoadingBookings: boolean;
}

export function useAdminCreateSection(
  /** Whose week to shade. Refetches as the admin changes either. */
  occupancyFor: { classId?: string; teacherId?: string; labOrgIds?: string[] } = {},
): AdminCreateSectionVM {
  const queryClient = useQueryClient();

  /*
    A QUERY, not a mutation: the answer depends only on who and where, so it is
    cacheable and refetchable — and keying it on those inputs means switching
    teacher back and forth does not re-hit the server.
  */
  const bookingsQuery = useQuery({
    queryKey: [
      "classes",
      "occupancy",
      occupancyFor.classId ?? "new",
      occupancyFor.teacherId ?? "none",
      [...(occupancyFor.labOrgIds ?? [])].sort().join(","),
    ],
    queryFn: () => classesApi.occupancy(occupancyFor),
    enabled:
      Boolean(occupancyFor.classId) ||
      Boolean(occupancyFor.teacherId) ||
      (occupancyFor.labOrgIds?.length ?? 0) > 0,
  });

  const checkMutation = useMutation({
    mutationFn: (input: {
      schedule: ClassSchedule;
      classId?: string;
      teacherId?: string;
      labOrgIds?: string[];
    }) => classesApi.checkSchedule(input),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateClassInput) => classesApi.create(input),
    onSuccess: () => {
      // A new section changes the catalogue, every dashboard rollup, and the
      // timetable everyone reads — so nothing narrower than this is honest.
      void queryClient.invalidateQueries();
    },
  });

  return {
    create: (input) => createMutation.mutate(input),
    isCreating: createMutation.isPending,
    createError: createMutation.error ? toPresentableError(createMutation.error) : null,
    createdClass: createMutation.data ?? null,
    reset: () => {
      createMutation.reset();
      checkMutation.reset();
    },

    check: (input) => checkMutation.mutate(input),
    conflicts: checkMutation.data?.conflicts ?? [],
    isChecking: checkMutation.isPending,

    bookings: bookingsQuery.data?.bookings ?? [],
    isLoadingBookings: bookingsQuery.isLoading,
  };
}
