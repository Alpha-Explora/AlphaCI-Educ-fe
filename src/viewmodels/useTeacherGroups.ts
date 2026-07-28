"use client";
// ============================================================================
// VIEWMODEL LAYER — student groups for one class (read-only, derived).
//
// There is no groups resource on the API: a group only exists as the set of
// RepositoryCollaborator rows the backend writes when a teacher creates a GROUP
// project (see classes.service#persistGroupCollaborators). So this viewmodel
// reconstructs the groups by walking
//
//   class assignments → (isGroup only) → their repositories → repo detail
//
// and reading `collaborators` off each detail. Membership is therefore whatever
// the teacher picked in the create-project group builder — it can only be
// changed by creating another group project, never edited here.
//
// SPLIT projects produce TWO repos per group (`<base>-be` and `<base>-fe`), so
// repos are folded back onto their base name to avoid listing one group twice.
//
// The two fan-outs below are deliberate: `useQueries` de-duplicates and caches
// each repo detail, and a class has tens of repos, not thousands. If group
// membership ever becomes a first-class resource, this whole file collapses
// into a single `groupsApi.list(classId)` query.
// ============================================================================
import { useQuery, useQueries } from "@tanstack/react-query";
import { assignmentsApi, classesApi, repositoriesApi } from "@/models/api";
import type { Assignment, RepoComponent, SystemUser } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface StudentGroup {
  /** Base repo name — stable across a SPLIT project's BE/FE pair. */
  key: string;
  /** "Group 1", "Group 2" — position within the assignment. */
  label: string;
  members: SystemUser[];
  /** BE + FE for SPLIT, a single entry otherwise. */
  repos: Array<{ id: string; repoName: string; component: RepoComponent }>;
}

export interface GroupProject {
  assignment: Assignment;
  groups: StudentGroup[];
}

export interface TeacherGroupsVM {
  projects: GroupProject[];
  /** Enrolled students not in any group of any group project in this class. */
  ungrouped: SystemUser[];
  totals: { projects: number; groups: number; groupedStudents: number };
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;
}

/** `cs101-a-f26-calc-group1-be` → `cs101-a-f26-calc-group1` (SINGLE unchanged). */
function baseRepoName(repoName: string, component: RepoComponent): string {
  if (component === "BACKEND") return repoName.replace(/-be$/, "");
  if (component === "FRONTEND") return repoName.replace(/-fe$/, "");
  return repoName;
}

export function useTeacherGroups(classId: string | null): TeacherGroupsVM {
  const rosterQuery = useQuery({
    queryKey: queryKeys.classes.roster(classId ?? "none"),
    queryFn: () => classesApi.roster(classId as string),
    enabled: Boolean(classId),
  });

  const assignmentsQuery = useQuery({
    queryKey: queryKeys.classes.assignments(classId ?? "none"),
    queryFn: () => classesApi.assignments(classId as string),
    enabled: Boolean(classId),
  });

  const groupAssignments = (assignmentsQuery.data ?? []).filter((a) => a.isGroup);

  // Fan out 1 — the repos of every group project in this class.
  const repoQueries = useQueries({
    queries: groupAssignments.map((a) => ({
      queryKey: queryKeys.assignments.repositories(a.id),
      queryFn: () => assignmentsApi.repositories(a.id),
    })),
  });

  // Fan out 2 — collaborators live only on the repo DETAIL endpoint.
  const repoIds = repoQueries.flatMap((q) => (q.data ?? []).map((r) => r.id));
  const detailQueries = useQueries({
    queries: repoIds.map((id) => ({
      queryKey: queryKeys.repositories.detail(id),
      queryFn: () => repositoriesApi.get(id),
    })),
  });

  const collaboratorsByRepoId = new Map<string, SystemUser[]>(
    detailQueries.flatMap((q) =>
      q.data ? ([[q.data.repo.id, q.data.collaborators]] as const) : [],
    ),
  );

  const projects: GroupProject[] = groupAssignments.map((assignment, idx) => {
    const repos = repoQueries[idx]?.data ?? [];

    // Fold the (possibly split) repos of one group back into a single entry.
    const byBase = new Map<string, StudentGroup>();
    for (const repo of repos) {
      const component = repo.component ?? "SINGLE";
      const key = baseRepoName(repo.repoName, component);
      const group = byBase.get(key) ?? {
        key,
        label: `Group ${byBase.size + 1}`,
        members: [],
        repos: [],
      };
      group.repos.push({ id: repo.id, repoName: repo.repoName, component });

      // BE and FE carry identical collaborator rows — take the first that has
      // loaded rather than concatenating duplicates.
      if (group.members.length === 0) {
        group.members = collaboratorsByRepoId.get(repo.id) ?? [];
      }
      byBase.set(key, group);
    }

    return { assignment, groups: [...byBase.values()] };
  });

  const groupedIds = new Set<string>();
  for (const p of projects) {
    for (const g of p.groups) for (const m of g.members) groupedIds.add(m.id);
  }
  const ungrouped = (rosterQuery.data?.students ?? []).filter(
    (s) => !groupedIds.has(s.id),
  );

  const fanOutLoading =
    repoQueries.some((q) => q.isLoading) || detailQueries.some((q) => q.isLoading);
  const firstError =
    assignmentsQuery.error ??
    rosterQuery.error ??
    repoQueries.find((q) => q.error)?.error ??
    detailQueries.find((q) => q.error)?.error;

  return {
    projects,
    ungrouped,
    totals: {
      projects: projects.length,
      groups: projects.reduce((sum, p) => sum + p.groups.length, 0),
      groupedStudents: groupedIds.size,
    },
    isLoading: rosterQuery.isLoading || assignmentsQuery.isLoading || fanOutLoading,
    error: firstError ? toPresentableError(firstError) : null,
    refetch: () => {
      void rosterQuery.refetch();
      void assignmentsQuery.refetch();
      repoQueries.forEach((q) => void q.refetch());
      detailQueries.forEach((q) => void q.refetch());
    },
  };
}
