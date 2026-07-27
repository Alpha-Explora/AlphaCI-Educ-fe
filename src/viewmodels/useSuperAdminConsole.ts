"use client";
// ============================================================================
// VIEWMODEL LAYER — Platform operator console (/super)
//
// Owns everything the cross-lab console needs: the fetch, its polling cadence,
// presence classification (delegated to the shared ./presence policy), the
// people search, the lab health verdict, and the "open this lab" action.
//
// The View is pure presentation — it renders rows and calls the handlers here.
// Nothing in app/super/ fetches, filters, or decides what "needs attention"
// means.
// ============================================================================
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { platformApi } from "@/models/api";
import type {
  PlatformLabSummary,
  PlatformPerson,
  PlatformOverview,
  UserRole,
} from "@/models/types";
import { useSession } from "./useSession";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";
import {
  classifyPresence,
  PRESENCE_REFRESH_INTERVAL_MS,
  type Presence,
} from "./presence";

/** Why a lab is flagged. Empty means healthy. */
export type LabAlert = "DISCONNECTED" | "FAILED_RUNS" | "PLAGIARISM" | "NO_TEACHERS";

export interface LabRow extends PlatformLabSummary {
  alerts: LabAlert[];
  needsAttention: boolean;
}

export interface PersonRow extends PlatformPerson {
  presence: Presence;
}

export type RoleFilter = UserRole | "ALL";

export interface SuperAdminConsoleVM {
  labs: LabRow[];
  /** People after the search + role filter. */
  people: PersonRow[];
  totals: PlatformOverview["totals"] | null;
  /** Platform-wide presence, computed over every account. */
  onlineNow: number;
  neverSignedIn: number;
  labsNeedingAttention: number;
  generatedAt: string | null;

  query: string;
  setQuery: (value: string) => void;
  roleFilter: RoleFilter;
  setRoleFilter: (value: RoleFilter) => void;
  isFilteredEmpty: boolean;

  /** Make `orgId` the active lab, then jump to the IT-Admin surface for it. */
  openLab: (orgId: string) => void;
  openingLabId: string | null;
  openLabError: string | null;

  isLoading: boolean;
  isRefreshing: boolean;
  error: PresentableError | null;
  refetch: () => void;
}

/**
 * What counts as "needs attention" for an operator.
 *
 * Deliberately conservative: only conditions someone would actually act on
 * today. A lab with no students yet is not broken, it is new — flagging that
 * would train the operator to ignore the column.
 */
function alertsFor(lab: PlatformLabSummary): LabAlert[] {
  const alerts: LabAlert[] = [];
  if (!lab.sourceHostingConnected) alerts.push("DISCONNECTED");
  if (lab.failedRuns > 0) alerts.push("FAILED_RUNS");
  if (lab.flaggedPlagiarism > 0) alerts.push("PLAGIARISM");
  // A lab with classes but nobody to teach them is a provisioning mistake.
  if (lab.classes > 0 && lab.teachers === 0) alerts.push("NO_TEACHERS");
  return alerts;
}

export function useSuperAdminConsole(): SuperAdminConsoleVM {
  const router = useRouter();
  const { selectLab } = useSession();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [openingLabId, setOpeningLabId] = useState<string | null>(null);
  const [openLabError, setOpenLabError] = useState<string | null>(null);

  const result = useQuery({
    queryKey: queryKeys.platform.overview,
    queryFn: () => platformApi.overview(),
    refetchInterval: PRESENCE_REFRESH_INTERVAL_MS,
  });

  const labs = useMemo<LabRow[]>(() => {
    const rows = (result.data?.labs ?? []).map((lab) => {
      const alerts = alertsFor(lab);
      return { ...lab, alerts, needsAttention: alerts.length > 0 };
    });
    // Labs needing attention first — the console's job is to surface problems,
    // not to preserve an arbitrary creation order.
    return rows.sort((a, b) => {
      if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
      return a.orgName.localeCompare(b.orgName);
    });
  }, [result.data]);

  const allPeople = useMemo<PersonRow[]>(() => {
    const now = Date.now();
    return (result.data?.people ?? []).map((person) => ({
      ...person,
      presence: classifyPresence(person, now),
    }));
  }, [result.data]);

  const people = useMemo<PersonRow[]>(() => {
    const needle = query.trim().toLowerCase();
    return allPeople
      .filter((p) => roleFilter === "ALL" || p.role === roleFilter)
      .filter(
        (p) =>
          !needle ||
          p.email.toLowerCase().includes(needle) ||
          p.fullName.toLowerCase().includes(needle) ||
          p.orgName.toLowerCase().includes(needle),
      )
      .sort((a, b) => {
        // Most recently active first; never-signed-in sinks to the bottom.
        const left = a.lastSeenAt ?? a.lastSignInAt ?? "";
        const right = b.lastSeenAt ?? b.lastSignInAt ?? "";
        if (left !== right) return right.localeCompare(left);
        return a.fullName.localeCompare(b.fullName);
      });
  }, [allPeople, query, roleFilter]);

  const openLab = useCallback(
    (orgId: string) => {
      setOpenLabError(null);
      setOpeningLabId(orgId);
      // Set the session's active lab BEFORE navigating: /admin reads the lab
      // from the session, so arriving first would render the previous lab's
      // data for a frame.
      void selectLab(orgId)
        .then(() => router.push("/admin"))
        .catch(() => {
          setOpenLabError("Couldn't open that laboratory. Please try again.");
          setOpeningLabId(null);
        });
    },
    [router, selectLab],
  );

  return {
    labs,
    people,
    totals: result.data?.totals ?? null,
    onlineNow: allPeople.filter((p) => p.presence === "ONLINE").length,
    neverSignedIn: allPeople.filter((p) => p.presence === "NEVER").length,
    labsNeedingAttention: labs.filter((l) => l.needsAttention).length,
    generatedAt: result.data?.generatedAt ?? null,

    query,
    setQuery,
    roleFilter,
    setRoleFilter,
    isFilteredEmpty: allPeople.length > 0 && people.length === 0,

    openLab,
    openingLabId,
    openLabError,

    isLoading: result.isLoading,
    isRefreshing: result.isFetching && !result.isLoading,
    error: result.error ? toPresentableError(result.error) : null,
    refetch: () => void result.refetch(),
  };
}
