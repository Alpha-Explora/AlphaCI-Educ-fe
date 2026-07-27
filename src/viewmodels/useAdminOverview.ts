"use client";
// ============================================================================
// VIEWMODEL LAYER — IT Admin overview
// Loads the org overview (GitHub App / SSO / SCIM status, zero-footprint seat
// savings, lab inventory) and exposes the archive-semester action.
// ============================================================================
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "@/models/api";
import type { AdminOverview, GithubTeamWithMembers } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface TeamTierGroup {
  tier: number;
  label: string;
  description: string;
  teams: GithubTeamWithMembers[];
}

// Access tiers described by what each group can DO. Previously these named the
// hosting provider and its role vocabulary ("OWNER privileges over the entire
// GitHub org", "teachers join as MAINTAINER") — that provider is now an
// implementation detail the admin UI never mentions.
const TIER_META: Record<number, { label: string; description: string }> = {
  1: {
    label: "Lab administrators",
    description: "Full control of this laboratory and everyone in it.",
  },
  2: {
    label: "Faculty",
    description: "Teaching staff who can create classes under their courses.",
  },
  3: {
    label: "Class groups",
    description: "One group per cohort, holding that class's teacher and projects.",
  },
};

export interface AdminOverviewVM {
  data: AdminOverview | undefined;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  // ADDENDUM A — GitHub team hierarchy, sorted by tier (1→3) then name,
  // and grouped into tiers for the hierarchy view.
  githubTeams: GithubTeamWithMembers[];
  teamsByTier: TeamTierGroup[];

  archiveSemester: () => void;
  isArchiving: boolean;
  archiveError: PresentableError | null;
  lastArchivedCount: number | null;
}

export function useAdminOverview(orgId: string | null): AdminOverviewVM {
  const queryClient = useQueryClient();
  const [lastArchivedCount, setLastArchivedCount] = useState<number | null>(null);

  const query = useQuery({
    queryKey: queryKeys.organizations.adminOverview(orgId ?? "none"),
    queryFn: () => organizationsApi.adminOverview(orgId as string),
    enabled: Boolean(orgId),
  });

  // Sort the hierarchy by tier (1→3) then name — derivation stays in the VM.
  const githubTeams = useMemo<GithubTeamWithMembers[]>(() => {
    const teams = query.data?.githubTeams ?? [];
    return [...teams].sort(
      (a, b) => a.tier - b.tier || a.name.localeCompare(b.name),
    );
  }, [query.data]);

  const teamsByTier = useMemo<TeamTierGroup[]>(() => {
    const groups = new Map<number, GithubTeamWithMembers[]>();
    for (const team of githubTeams) {
      const bucket = groups.get(team.tier) ?? [];
      bucket.push(team);
      groups.set(team.tier, bucket);
    }
    return [...groups.keys()]
      .sort((a, b) => a - b)
      .map((tier) => ({
        tier,
        label: TIER_META[tier]?.label ?? `Tier ${tier}`,
        description: TIER_META[tier]?.description ?? "",
        teams: groups.get(tier) ?? [],
      }));
  }, [githubTeams]);

  const archiveMutation = useMutation({
    mutationFn: () => organizationsApi.archiveSemester(orgId as string),
    onSuccess: (res) => {
      setLastArchivedCount(res.archived);
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.adminOverview(orgId ?? "none"),
      });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),

    githubTeams,
    teamsByTier,

    archiveSemester: () => archiveMutation.mutate(),
    isArchiving: archiveMutation.isPending,
    archiveError: archiveMutation.error
      ? toPresentableError(archiveMutation.error)
      : null,
    lastArchivedCount,
  };
}
