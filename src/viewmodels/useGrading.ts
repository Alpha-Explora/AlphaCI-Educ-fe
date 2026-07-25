"use client";
// ============================================================================
// VIEWMODEL LAYER — Grading + submission actions
// Owns the teacher grading form state (grade + feedback) and the mutations for
// grading and student submission. Invalidates the repo detail cache on success.
// ============================================================================
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { AssignmentRepository } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface GradingVM {
  grade: string; // controlled input value
  feedback: string;
  setGrade: (v: string) => void;
  setFeedback: (v: string) => void;
  submitGrade: () => void;
  isGrading: boolean;
  gradeError: PresentableError | null;
  validationError: string | null;
  isGraded: boolean;

  submitForGrading: () => void;
  isSubmitting: boolean;
  submitError: PresentableError | null;
}

interface GradingArgs {
  repoId: string | null;
  maxPoints: number;
  initialGrade: number | null;
  initialFeedback: string | null;
  status: AssignmentRepository["status"] | undefined;
}

export function useGrading({
  repoId,
  maxPoints,
  initialGrade,
  initialFeedback,
  status,
}: GradingArgs): GradingVM {
  const queryClient = useQueryClient();
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Seed the form once the repo's existing grade/feedback arrive.
  useEffect(() => {
    setGrade(initialGrade !== null && initialGrade !== undefined ? String(initialGrade) : "");
    setFeedback(initialFeedback ?? "");
  }, [initialGrade, initialFeedback]);

  const invalidate = () => {
    if (!repoId) return;
    queryClient.invalidateQueries({
      queryKey: queryKeys.repositories.detail(repoId),
    });
  };

  const gradeMutation = useMutation({
    mutationFn: (payload: { grade: number; feedback: string }) =>
      repositoriesApi.grade(repoId as string, payload),
    onSuccess: invalidate,
  });

  const submitMutation = useMutation({
    mutationFn: () => repositoriesApi.submit(repoId as string),
    onSuccess: invalidate,
  });

  const submitGrade = () => {
    setValidationError(null);
    const numeric = Number(grade);
    if (grade.trim() === "" || Number.isNaN(numeric)) {
      setValidationError("Enter a numeric grade.");
      return;
    }
    if (numeric < 0 || numeric > maxPoints) {
      setValidationError(`Grade must be between 0 and ${maxPoints}.`);
      return;
    }
    gradeMutation.mutate({ grade: numeric, feedback: feedback.trim() });
  };

  return {
    grade,
    feedback,
    setGrade,
    setFeedback,
    submitGrade,
    isGrading: gradeMutation.isPending,
    gradeError: gradeMutation.error ? toPresentableError(gradeMutation.error) : null,
    validationError,
    isGraded: status === "GRADED",

    submitForGrading: () => submitMutation.mutate(),
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error ? toPresentableError(submitMutation.error) : null,
  };
}
