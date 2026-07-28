"use client";
// ============================================================================
// VIEWMODEL LAYER — which laboratories carry a given course code.
//
// Course codes are unique per organization, so the SAME code can exist as a
// separate course record in several labs. When a teacher says a class meets in
// another laboratory, the useful thing to tell them is whether that lab's
// catalog also carries this course — because if it does, there may already be a
// section of it over there run by someone else, and if it doesn't, the class is
// simply borrowing a room.
//
// Reads GET /courses unscoped: the per-lab catalog endpoints can't see across
// organizations, which is the whole point here.
// ============================================================================
import { useQuery } from "@tanstack/react-query";
import { coursesApi } from "@/models/api";
import { queryKeys } from "./queryKeys";

export interface CourseCodesByLabVM {
  /** true when `code` exists in that laboratory's catalog. */
  labHasCode: (orgId: string, code: string | null) => boolean;
  isLoading: boolean;
}

export function useCourseCodesByLab(): CourseCodesByLabVM {
  const query = useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: () => coursesApi.list(),
  });

  const byLab = new Map<string, Set<string>>();
  for (const course of query.data ?? []) {
    const set = byLab.get(course.orgId) ?? new Set<string>();
    set.add(course.code.trim().toUpperCase());
    byLab.set(course.orgId, set);
  }

  return {
    labHasCode: (orgId, code) =>
      Boolean(code) && (byLab.get(orgId)?.has(code!.trim().toUpperCase()) ?? false),
    isLoading: query.isLoading,
  };
}
