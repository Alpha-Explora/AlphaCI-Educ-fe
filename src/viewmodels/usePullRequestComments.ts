"use client";
// ============================================================================
// VIEWMODEL LAYER — the conversation on one pull request.
//
// Separate from usePullRequests, and deliberately so. That hook's mutations all
// invalidate the repository, the runs AND the pull request list, because a merge
// moves `main` and changes all three. A COMMENT changes none of them — it is
// talk, not state — so it invalidates only its own thread. Folding it in would
// make every message a student typed refetch the whole workspace.
//
// The permission rules are the SERVER's (see pull-requests.service.ts). What is
// computed here is only what the UI needs to decide whether to draw a control:
// showing an Edit button that always 403s is worse than not showing one.
// ============================================================================
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { PullRequestComment, SystemUser } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

/** A top-level comment with the replies that hang off it. */
export interface CommentThread {
  comment: PullRequestComment;
  replies: PullRequestComment[];
}

export interface PullRequestCommentsVM {
  threads: CommentThread[];
  count: number;
  isLoading: boolean;
  error: PresentableError | null;

  add: (input: { body: string; replyToId?: string }) => void;
  isAdding: boolean;
  edit: (input: { commentId: string; body: string }) => void;
  isEditing: boolean;
  remove: (commentId: string) => void;
  isRemoving: boolean;
  actionError: PresentableError | null;

  /** May this viewer rewrite that comment? Author only, teachers included. */
  canEdit: (comment: PullRequestComment) => boolean;
  /** May this viewer delete it? The author, or staff (moderation). */
  canDelete: (comment: PullRequestComment) => boolean;
}

export function usePullRequestComments(
  repoId: string | null,
  number: number | null,
  viewer: SystemUser | null,
): PullRequestCommentsVM {
  const queryClient = useQueryClient();
  const enabled = Boolean(repoId) && number !== null;

  const query = useQuery({
    queryKey: queryKeys.repositories.pullRequestComments(repoId ?? "none", number ?? 0),
    queryFn: () => repositoriesApi.pullRequestComments(repoId as string, number as number),
    enabled,
  });

  const invalidate = () => {
    if (!enabled) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.repositories.pullRequestComments(repoId as string, number as number),
    });
  };

  const addMutation = useMutation({
    mutationFn: (input: { body: string; replyToId?: string }) =>
      repositoriesApi.createPullRequestComment(repoId as string, number as number, input),
    onSuccess: invalidate,
  });

  const editMutation = useMutation({
    mutationFn: (input: { commentId: string; body: string }) =>
      repositoriesApi.updatePullRequestComment(
        repoId as string,
        number as number,
        input.commentId,
        input.body,
      ),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (commentId: string) =>
      repositoriesApi.deletePullRequestComment(repoId as string, number as number, commentId),
    onSuccess: invalidate,
  });

  /*
    Flat list -> threads.

    Built here rather than by the server because it is a presentation shape: the
    server stores a parent id, which is the fact, and how deeply a client chooses
    to draw it is not the server's business. A reply whose parent has gone (a
    race with a delete) is promoted to top level rather than dropped — losing a
    student's words to a rendering rule would be worse than showing them out of
    context.
  */
  const threads = useMemo<CommentThread[]>(() => {
    const all = query.data ?? [];
    const roots = all.filter((c) => !c.replyToId);
    const rootIds = new Set(roots.map((c) => c.id));
    const orphans = all.filter((c) => c.replyToId && !rootIds.has(c.replyToId));

    return [...roots, ...orphans]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((comment) => ({
        comment,
        replies: all
          .filter((c) => c.replyToId === comment.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      }));
  }, [query.data]);

  const isStaff =
    viewer?.role === "TEACHER" || viewer?.role === "ADMIN" || viewer?.role === "SUPER_ADMIN";

  return {
    threads,
    count: query.data?.length ?? 0,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,

    add: (input) => addMutation.mutate(input),
    isAdding: addMutation.isPending,
    edit: (input) => editMutation.mutate(input),
    isEditing: editMutation.isPending,
    remove: (commentId) => removeMutation.mutate(commentId),
    isRemoving: removeMutation.isPending,
    actionError:
      addMutation.error || editMutation.error || removeMutation.error
        ? toPresentableError(
            addMutation.error ?? editMutation.error ?? removeMutation.error,
          )
        : null,

    // Mirrors the server exactly. A teacher may DELETE anyone's comment
    // (moderation) but may never rewrite one — that would leave different words
    // under a student's own name.
    canEdit: (comment) => comment.authorUserId === viewer?.id,
    canDelete: (comment) => comment.authorUserId === viewer?.id || isStaff,
  };
}
