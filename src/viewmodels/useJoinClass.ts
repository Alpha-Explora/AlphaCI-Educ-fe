"use client";
// ============================================================================
// VIEWMODEL LAYER — Join a class by code (student, ADDENDUM D)
// The whiteboard flow: teacher writes "CS101-XYZ", student enters it here.
// Owns the mutation, code normalization, friendly HTTP-status error mapping
// (404 unknown / 410 inactive-expired), and cache invalidation so the hub and
// class list refresh. Views just render `message` / `joinedClass`.
// ============================================================================
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { classesApi, ApiError } from "@/models/api";
import type { ClassCohort } from "@/models/types";
import { toPresentableError, type PresentableError } from "./errors";
import { brand } from "@/config/brand";

export interface JoinClassVM {
  join: (rawCode: string) => void;
  isJoining: boolean;
  /** Set on success — the class the student is now enrolled in. */
  joinedClass: ClassCohort | null;
  /** true when the student was already enrolled (idempotent re-join). */
  alreadyEnrolled: boolean;
  /** Friendly, user-facing failure message (null when there is no error). */
  message: string | null;
  error: PresentableError | null;
  reset: () => void;
}

/** Uppercase + strip whitespace so "cs101-xyz " → "CS101-XYZ". */
export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Maps a failed join to a friendly, student-readable message. */
export function joinErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError)
      return `Can't reach ${brand.name} right now. Check your connection and try again.`;
    if (err.status === 404) return "That code doesn't match any class.";
    if (err.status === 410) return "This code is no longer active.";
    if (err.status === 401 || err.status === 403)
      return "Please sign in again to join a class.";
    return err.message;
  }
  return "Couldn't join that class. Please try again.";
}

export function useJoinClass(studentId?: string | null): JoinClassVM {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (rawCode: string) => classesApi.join(normalizeJoinCode(rawCode)),
    onSuccess: () => {
      // Refresh the student's dashboard (assignments + classes) and class lists.
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards", "student"] });
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: ["students", studentId, "classes"] });
      }
    },
  });

  const alreadyEnrolled = mutation.data?.alreadyEnrolled ?? false;

  // Success-but-already-enrolled is surfaced as an informational message.
  let message: string | null = null;
  if (mutation.error) message = joinErrorMessage(mutation.error);
  else if (alreadyEnrolled) message = "You're already in this class.";

  return {
    join: (rawCode: string) => mutation.mutate(rawCode),
    isJoining: mutation.isPending,
    joinedClass: mutation.data?.class ?? null,
    alreadyEnrolled,
    message,
    error: mutation.error ? toPresentableError(mutation.error) : null,
    reset: () => mutation.reset(),
  };
}
