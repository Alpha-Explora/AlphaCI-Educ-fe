"use client";
// ============================================================================
// VIEWMODEL LAYER — Teacher creates a class (ADDENDUM E)
// Owns client-side validation (all four fields required, trimmed), the create
// mutation, friendly error mapping (400 duplicate), and invalidation of the
// class lists + teacher dashboard so the new class appears immediately.
// The created ClassCohort carries its auto-generated magicJoinCode, which the
// View shows so the teacher can write it on the whiteboard right away.
// ============================================================================
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { classesApi, ApiError } from "@/models/api";
import type { ClassCohort, CreateClassInput } from "@/models/types";
import { toPresentableError, type PresentableError } from "./errors";

const DUPLICATE_MESSAGE =
  "A class for that course, section and term already exists.";

// ADDENDUM H — a class is now created UNDER a course the teacher was invited
// to. The teacher picks a course (courseId) and supplies section + term; the
// course supplies code/title/org. `name` is an optional display override.
/** Trims every field so blank-but-whitespace input can't slip through. */
export function normalizeCreateClassInput(input: CreateClassInput): CreateClassInput {
  return {
    courseId: input.courseId.trim(),
    section: input.section.trim(),
    term: input.term.trim(),
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
  };
}

/** Course, section and term are required → list of human-readable errors. */
export function validateCreateClass(input: CreateClassInput): string[] {
  const v = normalizeCreateClassInput(input);
  const errors: string[] = [];
  if (!v.courseId) errors.push("Please choose a course.");
  if (!v.section) errors.push("Section is required.");
  if (!v.term) errors.push("Term is required.");
  return errors;
}

/** Maps a failed create to a friendly, teacher-readable message. */
export function createClassErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError)
      return "Can't reach AlphaCI right now. Check your connection and try again.";
    if (err.status === 400) {
      // Client validation already guarantees non-blank fields, so a 400 here is
      // almost always the duplicate (code, section, term) constraint.
      const m = err.message ?? "";
      if (!m || /exist|duplicate|already|taken/i.test(m)) return DUPLICATE_MESSAGE;
      return m;
    }
    if (err.status === 401) return "Please sign in as a teacher to create a class.";
    if (err.status === 403)
      return "You're not assigned to teach this course. Ask your IT Admin to add you.";
    return err.message;
  }
  return "Couldn't create the class. Please try again.";
}

export interface CreateClassVM {
  submit: (input: CreateClassInput) => void;
  isSubmitting: boolean;
  validationErrors: string[];
  /** Friendly, user-facing failure message (null when there is no error). */
  message: string | null;
  error: PresentableError | null;
  /** The created class, including its auto-generated join code. */
  createdClass: ClassCohort | null;
  reset: () => void;
}

export function useCreateClass(): CreateClassVM {
  const queryClient = useQueryClient();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: (input: CreateClassInput) =>
      classesApi.create(normalizeCreateClassInput(input)),
    onSuccess: () => {
      // The new class must appear on the teacher dashboard immediately.
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards", "teacher"] });
    },
  });

  const submit = (input: CreateClassInput) => {
    const errors = validateCreateClass(input);
    setValidationErrors(errors);
    if (errors.length > 0) return; // block invalid submits; View shows errors
    mutation.mutate(input);
  };

  return {
    submit,
    isSubmitting: mutation.isPending,
    validationErrors,
    message: mutation.error ? createClassErrorMessage(mutation.error) : null,
    error: mutation.error ? toPresentableError(mutation.error) : null,
    createdClass: mutation.data ?? null,
    reset: () => {
      mutation.reset();
      setValidationErrors([]);
    },
  };
}
