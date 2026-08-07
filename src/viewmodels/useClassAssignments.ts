"use client";
// VIEWMODEL LAYER — Class detail + assignments (teacher class page).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi, classesApi, ApiError } from "@/models/api";
import type { Assignment } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";
import { brand } from "@/config/brand";

function mapDeleteError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return `Can't reach ${brand.name} right now. Try again.`;
    if (err.status === 401 || err.status === 403)
      return "Only the teacher of this class (or an admin) can delete a project.";
    return err.message;
  }
  return "Couldn't delete the project. Please try again.";
}

export interface ClassAssignmentsVM {
  assignments: Assignment[];
  isLoading: boolean;
  error: PresentableError | null;

  deleteAssignment: (id: string) => void;
  isDeleting: boolean;
  deleteError: string | null;
  deletingId: string | null;

  // ADDENDUM L — end (close) / reopen a project.
  setProjectClosed: (id: string, closed: boolean) => void;
  isSettingClosed: boolean;
  closingId: string | null;
}

/**
 * @param onProjectDeleted Called after a successful delete. Exists for the
 *   project PAGE, which is the deleted thing — it has to leave, and a page
 *   rendering a project the server has just dropped would otherwise fall to a
 *   "not found" state the teacher did not ask for. Optional because the class
 *   page deletes from a list it stays on.
 */
export function useClassAssignments(
  classId: string | null,
  onProjectDeleted?: (assignmentId: string) => void,
): ClassAssignmentsVM {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.classes.assignments(classId ?? "none"),
    queryFn: () => classesApi.assignments(classId as string),
    enabled: Boolean(classId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.assignments(classId ?? "none") });
    if (classId) queryClient.invalidateQueries({ queryKey: queryKeys.classes.roster(classId) });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assignmentsApi.remove(id),
    onSuccess: (_result, id) => {
      invalidate();
      onProjectDeleted?.(id);
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, closed }: { id: string; closed: boolean }) =>
      closed ? assignmentsApi.end(id) : assignmentsApi.reopen(id),
    onSuccess: invalidate,
  });

  return {
    assignments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,

    deleteAssignment: (id) => {
      setDeletingId(id);
      deleteMutation.mutate(id);
    },
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error ? mapDeleteError(deleteMutation.error) : null,
    deletingId,

    setProjectClosed: (id, closed) => {
      setClosingId(id);
      closeMutation.mutate({ id, closed });
    },
    isSettingClosed: closeMutation.isPending,
    closingId,
  };
}
