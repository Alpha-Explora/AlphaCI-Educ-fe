"use client";
// VIEWMODEL LAYER — the teacher's hidden test suite for one assignment.
//
// Reads the SUMMARY by default and fetches CONTENT only when a teacher opens
// the editor. That mirrors the backend's split: test source is never carried
// around incidentally, so a component that renders this viewmodel cannot leak
// it by accident.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hiddenTestsApi, ApiError } from "@/models/api";
import type {
  HiddenTestFile,
  HiddenTestSuiteSummary,
  UploadHiddenTestsInput,
} from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";
import { brand } from "@/config/brand";

function mapError(err: unknown, verb: string): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return `Can't reach ${brand.name} right now. Try again.`;
    if (err.status === 401 || err.status === 403)
      return `Only the teacher of this class (or an admin) can ${verb} hidden tests.`;
    // 400 carries the server's own validation message — an unsafe path, a
    // duplicate name, a suite over the size limit. Those are precise and
    // actionable, so they are shown rather than replaced with a generic line.
    return err.message;
  }
  return `Couldn't ${verb} the hidden tests. Please try again.`;
}

export interface HiddenTestsVM {
  summary: HiddenTestSuiteSummary | null;
  isLoading: boolean;
  error: PresentableError | null;

  /** Test source, loaded only after `loadContent()`. */
  files: HiddenTestFile[] | null;
  hints: string[];
  isLoadingContent: boolean;
  loadContent: () => void;

  upload: (input: UploadHiddenTestsInput) => void;
  isUploading: boolean;
  uploadError: string | null;

  remove: () => void;
  isRemoving: boolean;
  removeError: string | null;
}

export function useHiddenTests(assignmentId: string | null): HiddenTestsVM {
  const queryClient = useQueryClient();
  const [wantContent, setWantContent] = useState(false);

  const summaryQuery = useQuery({
    queryKey: queryKeys.hiddenTests.summary(assignmentId ?? ""),
    queryFn: () => hiddenTestsApi.summary(assignmentId as string),
    enabled: Boolean(assignmentId),
  });

  const contentQuery = useQuery({
    queryKey: queryKeys.hiddenTests.content(assignmentId ?? ""),
    queryFn: () => hiddenTestsApi.content(assignmentId as string),
    // Only once the teacher asks, and only when a suite exists — requesting
    // content for an assignment without one is a guaranteed 404.
    enabled: Boolean(assignmentId) && wantContent && Boolean(summaryQuery.data),
  });

  function invalidate() {
    if (!assignmentId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.hiddenTests.summary(assignmentId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.hiddenTests.content(assignmentId) });
  }

  const uploadMutation = useMutation({
    mutationFn: (input: UploadHiddenTestsInput) =>
      hiddenTestsApi.upload(assignmentId as string, input),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: () => hiddenTestsApi.remove(assignmentId as string),
    onSuccess: () => {
      setWantContent(false);
      invalidate();
    },
  });

  return {
    summary: summaryQuery.data ?? null,
    isLoading: summaryQuery.isLoading,
    error: summaryQuery.error ? toPresentableError(summaryQuery.error) : null,

    files: contentQuery.data?.files ?? null,
    hints: contentQuery.data?.hints ?? [],
    isLoadingContent: contentQuery.isLoading && wantContent,
    loadContent: () => setWantContent(true),

    upload: (input) => uploadMutation.mutate(input),
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error ? mapError(uploadMutation.error, "upload") : null,

    remove: () => removeMutation.mutate(),
    isRemoving: removeMutation.isPending,
    removeError: removeMutation.error ? mapError(removeMutation.error, "remove") : null,
  };
}
