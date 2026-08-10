"use client";
// ============================================================================
// VIEWMODEL LAYER — editing who is in each group of one project.
//
// Holds the DRAFT. Nothing is sent until the teacher saves, because the only
// way to express a swap is to move both students and submit once: under
// incremental saves, whichever half went first would break the 2-4 rule and be
// refused. That constraint is the reason this is a draft editor and not a set
// of buttons that each call the API.
//
// ── VALIDATION IS MIRRORED, NOT OWNED ──────────────────────────────────────
//
// The rules below (2-4, one group each) are a copy of the server's, kept here
// only so the Save button can be disabled with a reason instead of round-
// tripping to a 400. The server re-checks every one of them against class state
// this page cannot see — enrolment especially — and it is the authority.
//
// This session has fixed three bugs caused by a duplicated rule drifting from
// its original, so: if these two ever disagree, the server is right and this
// file is the one to change. The shared constants come from useCreateProject
// rather than being retyped, which is the part that actually kept them together
// last time.
// ============================================================================
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi } from "@/models/api";
import { GROUP_MAX, GROUP_MIN } from "./useCreateProject";
import type { SystemUser, UpdateGroupsResult } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface DraftGroup {
  key: string;
  /** Display name — "Group 1", by position. The key is the identity. */
  label: string;
  members: SystemUser[];
  /** Either half already submitted or marked. Drives the removal warning. */
  hasSubmittedWork: boolean;
  isGraded: boolean;
}

export interface EditGroupsVM {
  isLoading: boolean;
  error: PresentableError | null;

  draft: DraftGroup[];
  /** Enrolled students currently in no group of this project. */
  unassigned: SystemUser[];
  /** True once the draft differs from what the server holds. */
  isDirty: boolean;
  /** Human-readable reasons the draft cannot be saved. Empty means it can. */
  problems: string[];

  move: (studentId: string, toGroupKey: string | null) => void;
  reset: () => void;

  save: () => void;
  isSaving: boolean;
  saveError: PresentableError | null;
  result: UpdateGroupsResult | null;
}

export function useEditGroups(
  assignmentId: string | null,
  roster: readonly SystemUser[],
): EditGroupsVM {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.assignments.groups(assignmentId ?? "none"),
    queryFn: () => assignmentsApi.groups(assignmentId as string),
    enabled: Boolean(assignmentId),
  });

  // studentId -> group key, or absent for unassigned. A map rather than nested
  // arrays because every edit is "where does this one person go", and the
  // one-group-only rule is then true by construction rather than by checking.
  const [override, setOverride] = useState<Map<string, string | null> | null>(null);

  const serverPlacement = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const group of query.data ?? []) {
      for (const id of group.memberIds) map.set(id, group.key);
    }
    return map;
  }, [query.data]);

  const placement = override ?? serverPlacement;

  const byId = useMemo(() => new Map(roster.map((s) => [s.id, s])), [roster]);

  const draft = useMemo<DraftGroup[]>(
    () =>
      (query.data ?? []).map((group, index) => ({
        key: group.key,
        label: `Group ${index + 1}`,
        hasSubmittedWork: group.hasSubmittedWork,
        isGraded: group.isGraded,
        members: [...placement.entries()]
          .filter(([, key]) => key === group.key)
          .map(([studentId]) => byId.get(studentId))
          // A member who is not on the roster is a student unenrolled since the
          // group was formed. Dropping them from the draft is what the teacher
          // wants — saving then removes the stale row — but it must not crash
          // the page on the way there.
          .filter((s): s is SystemUser => Boolean(s)),
      })),
    [query.data, placement, byId],
  );

  const unassigned = useMemo(
    () => roster.filter((s) => !placement.get(s.id)),
    [roster, placement],
  );

  const problems = useMemo(() => {
    const out: string[] = [];
    for (const group of draft) {
      if (group.members.length < GROUP_MIN) {
        out.push(`${group.label} has ${group.members.length} — needs at least ${GROUP_MIN}.`);
      } else if (group.members.length > GROUP_MAX) {
        out.push(`${group.label} has ${group.members.length} — the most allowed is ${GROUP_MAX}.`);
      }
    }
    return out;
  }, [draft]);

  const isDirty = useMemo(() => {
    if (!override) return false;
    if (override.size !== serverPlacement.size) return true;
    for (const [studentId, key] of override) {
      if (serverPlacement.get(studentId) !== key) return true;
    }
    return false;
  }, [override, serverPlacement]);

  const move = useCallback(
    (studentId: string, toGroupKey: string | null) => {
      setOverride((prev) => {
        const next = new Map(prev ?? serverPlacement);
        // Removing from the map rather than storing null keeps `isDirty`'s size
        // comparison meaningful — an unassigned student is an ABSENT entry in
        // both this map and the server's.
        if (toGroupKey === null) next.delete(studentId);
        else next.set(studentId, toGroupKey);
        return next;
      });
    },
    [serverPlacement],
  );

  const reset = useCallback(() => setOverride(null), []);

  const mutation = useMutation({
    mutationFn: () =>
      assignmentsApi.updateGroups(
        assignmentId as string,
        draft.map((g) => ({ key: g.key, studentIds: g.members.map((m) => m.id) })),
      ),
    onSuccess: () => {
      setOverride(null);
      // Group membership is read by the repository detail (collaborators) and by
      // the class roster page, neither of which knows an edit happened. Invalidate
      // broadly rather than surgically — this runs once, on a deliberate save.
      void queryClient.invalidateQueries({ queryKey: ["assignments"] });
      void queryClient.invalidateQueries({ queryKey: ["repositories"] });
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  return {
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,

    draft,
    unassigned,
    isDirty,
    problems,

    move,
    reset,

    save: () => mutation.mutate(),
    isSaving: mutation.isPending,
    saveError: mutation.error ? toPresentableError(mutation.error) : null,
    result: mutation.data ?? null,
  };
}
