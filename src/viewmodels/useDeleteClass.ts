"use client";
// ============================================================================
// VIEWMODEL LAYER — teacher deletes one of their class sections.
//
// Owns the confirmation state as well as the mutation: whether the "are you
// sure?" dialog is open is a property of the delete flow, not of the page, and
// keeping it here means the View can't accidentally fire the destructive call
// without having asked first.
// ============================================================================
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { classesApi, ApiError } from "@/models/api";
import { brand } from "@/config/brand";

function mapDeleteError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return `Can't reach ${brand.name} right now. Try again.`;
    if (err.status === 403) return "You can only delete class sections you teach.";
    if (err.status === 404) return "That class no longer exists.";
    return err.message;
  }
  return "Couldn't delete the class. Please try again.";
}

export interface DeleteClassVM {
  /** true while the "are you sure?" dialog should be shown. */
  isConfirming: boolean;
  askToDelete: () => void;
  cancel: () => void;
  /** Runs the delete. `onDeleted` fires once it's gone, for navigation away. */
  confirm: () => void;
  isDeleting: boolean;
  error: string | null;
}

export function useDeleteClass(
  classId: string | null,
  onDeleted?: () => void,
): DeleteClassVM {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);

  const mutation = useMutation({
    mutationFn: () => classesApi.remove(classId as string),
    onSuccess: () => {
      setIsConfirming(false);
      // The section is gone from the teacher's dashboard, their course page and
      // any class list, so drop all three rather than patching one cache.
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
      onDeleted?.();
    },
  });

  return {
    isConfirming,
    askToDelete: () => setIsConfirming(true),
    // Keep the dialog open while the request is in flight — closing it mid-call
    // would suggest the delete was cancelled when it is actually running.
    cancel: () => {
      if (!mutation.isPending) setIsConfirming(false);
    },
    confirm: () => {
      if (classId) mutation.mutate();
    },
    isDeleting: mutation.isPending,
    error: mutation.error ? mapDeleteError(mutation.error) : null,
  };
}
