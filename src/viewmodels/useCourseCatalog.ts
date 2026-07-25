"use client";
// ============================================================================
// VIEWMODEL LAYER — IT-Admin course catalog (ADDENDUM H)
// Owns: the managed course list (each course + its instructors + class count),
// the org's teachers (invite pool), and the create-course / invite-instructor
// mutations with friendly error mapping and cache invalidation. Views bind to
// this; they never call the API directly.
// ============================================================================
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coursesApi, usersApi, ApiError } from "@/models/api";
import type {
  AddInstructorInput,
  CourseWithInstructors,
  CreateCourseInput,
  SystemUser,
} from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

function mapCreateError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return "Can't reach AlphaCI right now. Try again.";
    if (err.status === 400) return err.message || "A course with that code already exists.";
    if (err.status === 401 || err.status === 403)
      return "Only IT Admins can manage the course catalog.";
    return err.message;
  }
  return "Couldn't save. Please try again.";
}

function mapDeleteError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return "Can't reach AlphaCI right now. Try again.";
    if (err.status === 409)
      return err.message || "This course still has class sections. Remove them first.";
    if (err.status === 401 || err.status === 403)
      return "Only IT Admins can delete courses.";
    return err.message;
  }
  return "Couldn't delete the course. Please try again.";
}

function mapInviteError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return "Can't reach AlphaCI right now. Try again.";
    if (err.status === 409) return "That teacher is already an instructor of this course.";
    if (err.status === 400) return err.message || "That user can't be assigned to this course.";
    if (err.status === 401 || err.status === 403)
      return "Only IT Admins can assign instructors.";
    return err.message;
  }
  return "Couldn't add the instructor. Please try again.";
}

export interface CourseCatalogVM {
  courses: CourseWithInstructors[];
  teachers: SystemUser[];
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  createCourse: (input: CreateCourseInput) => void;
  isCreating: boolean;
  createError: string | null;

  addInstructor: (courseId: string, input: AddInstructorInput) => void;
  isInviting: boolean;
  inviteError: string | null;
  // Which course the last invite targeted — lets the View scope its error banner.
  invitingCourseId: string | null;

  deleteCourse: (courseId: string) => void;
  isDeleting: boolean;
  deleteError: string | null;
  // Which course the last delete targeted — lets the View scope its error banner.
  deletingCourseId: string | null;
}

export function useCourseCatalog(orgId: string | null): CourseCatalogVM {
  const queryClient = useQueryClient();
  const [invitingCourseId, setInvitingCourseId] = useState<string | null>(null);

  const coursesQuery = useQuery({
    queryKey: queryKeys.courses.managed(orgId ?? "none"),
    queryFn: () => coursesApi.managed(orgId as string),
    enabled: Boolean(orgId),
  });

  const teachersQuery = useQuery({
    queryKey: ["users", { role: "TEACHER", orgId: orgId ?? "none" }],
    queryFn: () => usersApi.list({ role: "TEACHER", orgId: orgId as string }),
    enabled: Boolean(orgId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateCourseInput) => coursesApi.create(input),
    onSuccess: invalidate,
  });

  const inviteMutation = useMutation({
    mutationFn: ({ courseId, input }: { courseId: string; input: AddInstructorInput }) =>
      coursesApi.addInstructor(courseId, input),
    onSuccess: invalidate,
  });

  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => coursesApi.remove(courseId),
    onSuccess: invalidate,
  });

  return {
    courses: coursesQuery.data ?? [],
    teachers: teachersQuery.data ?? [],
    isLoading: coursesQuery.isLoading || teachersQuery.isLoading,
    error: coursesQuery.error ? toPresentableError(coursesQuery.error) : null,
    refetch: () => {
      void coursesQuery.refetch();
      void teachersQuery.refetch();
    },

    // ADDENDUM K — always create in the lab the admin is currently viewing.
    // Without this the backend falls back to the first org (Lab 1), so a course
    // meant for Lab 2 would silently land in Lab 1.
    createCourse: (input) =>
      createMutation.mutate({ ...input, orgId: orgId ?? input.orgId }),
    isCreating: createMutation.isPending,
    createError: createMutation.error ? mapCreateError(createMutation.error) : null,

    addInstructor: (courseId, input) => {
      setInvitingCourseId(courseId);
      inviteMutation.mutate({ courseId, input });
    },
    isInviting: inviteMutation.isPending,
    inviteError: inviteMutation.error ? mapInviteError(inviteMutation.error) : null,
    invitingCourseId,

    deleteCourse: (courseId) => {
      setDeletingCourseId(courseId);
      deleteMutation.mutate(courseId);
    },
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error ? mapDeleteError(deleteMutation.error) : null,
    deletingCourseId,
  };
}
