"use client";
// ============================================================================
// VIEWMODEL LAYER — change which laboratories an EXISTING class meets in.
//
// Rooms get reassigned mid-term. Without this the only way to record the move
// would be to create the section again in the new lab, which would give one
// cohort two rosters and two gradebooks — the exact outcome sharing exists to
// prevent. So the list is editable in place on the class itself.
//
// Only labs the teacher actually teaches in are offered: a course assignment is
// what "teaches in this lab" means here, and the session's lab list is wider
// than that (it also counts plain GitHub membership).
//
// Repositories never move. They live in the lab that owns the course, and
// nothing here touches that.
// ============================================================================
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { classesApi, ApiError } from "@/models/api";
import type { AccessibleLab, Course } from "@/models/types";
import { brand } from "@/config/brand";

function mapError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return `Can't reach ${brand.name} right now. Try again.`;
    if (err.status === 403) return "You can only change sections you teach.";
    if (err.status === 404) return "That class no longer exists.";
    return err.message;
  }
  return "Couldn't update the laboratories. Please try again.";
}

export interface ClassMeetingLabsVM {
  /** Labs the teacher may pick from — those they hold a course in. */
  options: Array<{ id: string; name: string }>;
  /** Replace the whole list; the View toggles one entry and passes the result. */
  save: (orgIds: string[]) => void;
  isSaving: boolean;
  error: string | null;
}

export function useClassMeetingLabs({
  classId,
  labs,
  courses,
}: {
  classId: string | null;
  /** From the session — supplies the display names. */
  labs: AccessibleLab[];
  /** The teacher's courses across every lab — supplies which labs qualify. */
  courses: Course[];
}): ClassMeetingLabsVM {
  const queryClient = useQueryClient();

  const options = (() => {
    const nameById = new Map(labs.map((l) => [l.id, l.name]));
    return [...new Set(courses.map((c) => c.orgId))]
      .map((id) => ({ id, name: nameById.get(id) ?? "Unknown laboratory" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  const mutation = useMutation({
    mutationFn: (orgIds: string[]) =>
      classesApi.setMeetingLabs(classId as string, orgIds),
    onSuccess: () => {
      // Which labs a class appears in is exactly what these caches encode, so
      // both the roster header and every lab's dashboard have to be re-read.
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });

  return {
    options,
    save: (orgIds) => {
      if (classId) mutation.mutate(orgIds);
    },
    isSaving: mutation.isPending,
    error: mutation.error ? mapError(mutation.error) : null,
  };
}
