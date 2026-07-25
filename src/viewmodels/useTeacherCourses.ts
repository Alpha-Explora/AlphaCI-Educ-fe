"use client";
// VIEWMODEL LAYER — the courses a teacher was invited to instruct (ADDENDUM H).
// Powers the create-class course picker: a teacher can only create classes
// under a course an IT Admin assigned them to.
import { useQuery } from "@tanstack/react-query";
import { coursesApi } from "@/models/api";
import type { Course } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface TeacherCoursesVM {
  courses: Course[];
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;
}

// ADDENDUM K — `orgId` scopes the list to the teacher's selected lab, so she
// only sees the courses an admin assigned her in THAT lab.
export function useTeacherCourses(
  teacherId: string | null,
  orgId?: string | null,
): TeacherCoursesVM {
  const query = useQuery({
    queryKey: queryKeys.courses.list({
      teacherId: teacherId ?? undefined,
      orgId: orgId ?? undefined,
    }),
    queryFn: () =>
      coursesApi.list({ teacherId: teacherId as string, orgId: orgId ?? undefined }),
    enabled: Boolean(teacherId),
  });

  return {
    courses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}
