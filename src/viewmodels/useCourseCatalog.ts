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
  AccessibleLab,
  AddInstructorInput,
  CourseWithInstructors,
  CreateCourseInput,
  SystemUser,
} from "@/models/types";
import { useSession } from "./useSession";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";
import { brand } from "@/config/brand";

/** What happened for ONE laboratory when creating the course in several. */
export interface CreateCourseLabResult {
  labId: string;
  labName: string;
  ok: boolean;
  /** Why it failed, when `ok` is false. */
  error?: string;
}

function mapCreateError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return `Can't reach ${brand.name} right now. Try again.`;
    if (err.status === 400) return err.message || "A course with that code already exists.";
    if (err.status === 401 || err.status === 403)
      return "Only IT Admins can manage the course catalog.";
    return err.message;
  }
  return "Couldn't save. Please try again.";
}

function mapDeleteError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return `Can't reach ${brand.name} right now. Try again.`;
    if (err.status === 409)
      return err.message || "This course still has class sections. Remove them first.";
    if (err.status === 401 || err.status === 403)
      return "Only IT Admins can delete courses.";
    return err.message;
  }
  return "Couldn't delete the course. Please try again.";
}

function mapRemoveInstructorError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return `Can't reach ${brand.name} right now. Try again.`;
    // The service refuses while the teacher still has sections under the course.
    if (err.status === 409 || err.status === 404) return err.message;
    if (err.status === 401 || err.status === 403)
      return "Only IT Admins can remove instructors.";
    return err.message;
  }
  return "Couldn't remove that instructor. Please try again.";
}

function mapInviteError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return `Can't reach ${brand.name} right now. Try again.`;
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

  /** Every laboratory this admin may add a course to, as checkbox options. */
  labOptions: AccessibleLab[];
  /**
   * Course codes already used in each laboratory, upper-cased — keyed by lab id.
   *
   * The managed catalog is per-lab, so a clash with ANOTHER lab's copy is
   * invisible on this page and used to surface only as a rejection after
   * submitting. This lets the dialog mark the conflict before the admin ever
   * presses the button.
   */
  codesByLab: Map<string, Set<string>>;
  /**
   * Creates the course in EACH of `orgIds`. `onAllCreated` fires only when every
   * one saved — the dialog uses it to close itself, so a rejected code (or one
   * lab that already has it) keeps the form open with the admin's typing intact
   * rather than discarding it behind an error banner.
   */
  createCourse: (
    input: CreateCourseInput,
    orgIds: string[],
    onAllCreated?: () => void,
  ) => void;
  isCreating: boolean;
  createError: string | null;
  /** Per-lab breakdown of the last attempt, so a partial result reads honestly. */
  createResults: CreateCourseLabResult[] | null;
  /** Drop a stale error so reopening the dialog starts clean. */
  resetCreate: () => void;

  addInstructor: (courseId: string, input: AddInstructorInput) => void;
  isInviting: boolean;
  inviteError: string | null;
  // Which course the last invite targeted — lets the View scope its error banner.
  invitingCourseId: string | null;

  removeInstructor: (courseId: string, teacherId: string) => void;
  isRemovingInstructor: boolean;
  removeInstructorError: string | null;
  /** `${courseId}:${teacherId}` of the last removal — scopes the error banner. */
  removingInstructorKey: string | null;

  deleteCourse: (courseId: string) => void;
  isDeleting: boolean;
  deleteError: string | null;
  // Which course the last delete targeted — lets the View scope its error banner.
  deletingCourseId: string | null;
}

export function useCourseCatalog(orgId: string | null): CourseCatalogVM {
  const queryClient = useQueryClient();
  // An IT Admin administers every laboratory, so the session's lab list IS the
  // set they may create a course in (same basis as the add-teacher dialog).
  const { labs: labOptions } = useSession();
  const [invitingCourseId, setInvitingCourseId] = useState<string | null>(null);
  const [createResults, setCreateResults] = useState<CreateCourseLabResult[] | null>(
    null,
  );

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

  // Unscoped on purpose: the whole point is to see the OTHER labs' codes.
  const allCoursesQuery = useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: () => coursesApi.list(),
  });

  const codesByLab = new Map<string, Set<string>>();
  for (const course of allCoursesQuery.data ?? []) {
    const set = codesByLab.get(course.orgId) ?? new Set<string>();
    set.add(course.code.trim().toUpperCase());
    codesByLab.set(course.orgId, set);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  }

  const createMutation = useMutation({
    mutationFn: async ({
      input,
      orgIds,
    }: {
      input: CreateCourseInput;
      orgIds: string[];
    }) => {
      /*
        One POST per ticked laboratory, in sequence.

        Each laboratory keeps its own catalog and the duplicate-code check is
        scoped to the org (CoursesService.createCourse), so the same code in two
        labs is legitimate and they cannot collide with each other. Sequential is
        for the reporting rather than for safety here: it keeps each failure
        attached to the lab that produced it, so "CS-301 already exists in Chem
        Lab" can name the one lab that refused instead of failing the whole set.
      */
      const results: CreateCourseLabResult[] = [];
      for (const labId of orgIds) {
        const labName = labOptions.find((l) => l.id === labId)?.name ?? "this laboratory";
        try {
          await coursesApi.create({ ...input, orgId: labId });
          results.push({ labId, labName, ok: true });
        } catch (err) {
          // Keep going: the other laboratories are independent catalogs.
          results.push({ labId, labName, ok: false, error: mapCreateError(err) });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      setCreateResults(results);
      invalidate();
    },
  });

  const removeInstructorMutation = useMutation({
    mutationFn: ({ courseId, teacherId }: { courseId: string; teacherId: string }) =>
      coursesApi.removeInstructor(courseId, teacherId),
    onSuccess: invalidate,
  });
  const [removingInstructorKey, setRemovingInstructorKey] = useState<string | null>(
    null,
  );

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
    labOptions,
    codesByLab,
    // ADDENDUM K — a course lands in the labs the admin ticked. Falling back to
    // the lab being viewed keeps the old behaviour when nothing was picked;
    // without an orgId the backend silently uses the FIRST org, so a course
    // meant for Lab 2 would land in Lab 1.
    createCourse: (input, orgIds, onAllCreated) => {
      let targets = orgIds;
      if (targets.length === 0 && orgId) targets = [orgId];
      if (targets.length === 0) return;
      setCreateResults(null);
      createMutation.mutate(
        { input, orgIds: targets },
        {
          // Only when EVERY lab took it — a partial result keeps the dialog open
          // so the admin can see which lab refused and why.
          onSuccess: (results) => {
            if (results.every((r) => r.ok)) onAllCreated?.();
          },
        },
      );
    },
    isCreating: createMutation.isPending,
    // A thrown error is the unexpected case (the per-lab loop catches the rest);
    // otherwise the message is assembled from the per-lab results.
    createError: (() => {
      if (createMutation.error) return mapCreateError(createMutation.error);
      const results = createResults ?? [];
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) return null;

      // Lead with what DID happen. Listing only the rejections made a partial
      // success read as a total failure, so an admin whose course was created
      // in one lab would try again and then be told it already exists there.
      const created = results.filter((r) => r.ok);
      const createdText =
        created.length > 0
          ? `Created in ${created.map((r) => r.labName).join(", ")}. `
          : "";
      return (
        createdText +
        `Not created in ${failed.map((f) => `${f.labName} (${f.error})`).join(", ")}.`
      );
    })(),
    createResults,
    resetCreate: () => {
      createMutation.reset();
      setCreateResults(null);
    },

    addInstructor: (courseId, input) => {
      setInvitingCourseId(courseId);
      inviteMutation.mutate({ courseId, input });
    },
    isInviting: inviteMutation.isPending,
    inviteError: inviteMutation.error ? mapInviteError(inviteMutation.error) : null,
    invitingCourseId,

    removeInstructor: (courseId, teacherId) => {
      setRemovingInstructorKey(`${courseId}:${teacherId}`);
      removeInstructorMutation.mutate({ courseId, teacherId });
    },
    isRemovingInstructor: removeInstructorMutation.isPending,
    removeInstructorError: removeInstructorMutation.error
      ? mapRemoveInstructorError(removeInstructorMutation.error)
      : null,
    removingInstructorKey,

    deleteCourse: (courseId) => {
      setDeletingCourseId(courseId);
      deleteMutation.mutate(courseId);
    },
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error ? mapDeleteError(deleteMutation.error) : null,
    deletingCourseId,
  };
}
