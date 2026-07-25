"use client";
// VIEWMODEL LAYER — repositories for a single assignment (teacher grading list).
import { useQuery } from "@tanstack/react-query";
import { assignmentsApi } from "@/models/api";
import type { AssignmentRepository } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface AssignmentRepositoriesVM {
  repositories: AssignmentRepository[];
  isLoading: boolean;
  error: PresentableError | null;
}

export function useAssignmentRepositories(
  assignmentId: string | null,
): AssignmentRepositoriesVM {
  const query = useQuery({
    queryKey: queryKeys.assignments.repositories(assignmentId ?? "none"),
    queryFn: () => assignmentsApi.repositories(assignmentId as string),
    enabled: Boolean(assignmentId),
  });

  return {
    repositories: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
  };
}
