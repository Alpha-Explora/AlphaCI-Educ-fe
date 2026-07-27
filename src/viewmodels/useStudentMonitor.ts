"use client";
// ============================================================================
// VIEWMODEL LAYER — IT Admin student monitor
//
// Answers one question for the admin: which students are actually using this
// laboratory, and under which email address. Owns the polling cadence and the
// email search; the presence rule itself is shared with the platform console
// and lives in ./presence.
//
// The View renders rows. All derivation lives here.
// ============================================================================
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { organizationsApi } from "@/models/api";
import type { StudentAccountSummary } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";
import {
  classifyPresence,
  PRESENCE_REFRESH_INTERVAL_MS,
  type Presence,
} from "./presence";

export type StudentPresence = Presence;

export interface StudentMonitorRow extends StudentAccountSummary {
  presence: StudentPresence;
}

export interface StudentMonitorVM {
  /** Rows after the email/name filter, ready to render. */
  students: StudentMonitorRow[];
  /** Unfiltered totals — the header counts must not move when you search. */
  totalCount: number;
  onlineCount: number;
  everSignedInCount: number;
  neverSignedInCount: number;

  query: string;
  setQuery: (value: string) => void;
  /** True when a search is active but matches nothing. */
  isFilteredEmpty: boolean;

  isLoading: boolean;
  isRefreshing: boolean;
  error: PresentableError | null;
  refetch: () => void;
}

export function useStudentMonitor(orgId: string | null): StudentMonitorVM {
  const [query, setQuery] = useState("");

  const result = useQuery({
    queryKey: queryKeys.organizations.students(orgId ?? "none"),
    queryFn: () => organizationsApi.students(orgId as string),
    enabled: Boolean(orgId),
    // Presence is only meaningful if it's fresh. Polling stops automatically
    // when the tab loses focus (React Query's default), so an admin who leaves
    // this page open overnight isn't hammering the API.
    refetchInterval: PRESENCE_REFRESH_INTERVAL_MS,
  });

  const rows = useMemo<StudentMonitorRow[]>(() => {
    const now = Date.now();
    return (result.data ?? []).map((student) => ({
      ...student,
      presence: classifyPresence(student, now),
    }));
  }, [result.data]);

  const filtered = useMemo<StudentMonitorRow[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    // Email first — it's the identifier the admin was given — but matching the
    // name too means typing "maria" finds her without knowing her address.
    return rows.filter(
      (s) =>
        s.email.toLowerCase().includes(needle) ||
        s.fullName.toLowerCase().includes(needle),
    );
  }, [rows, query]);

  const onlineCount = rows.filter((s) => s.presence === "ONLINE").length;
  const neverSignedInCount = rows.filter((s) => s.presence === "NEVER").length;

  return {
    students: filtered,
    totalCount: rows.length,
    onlineCount,
    everSignedInCount: rows.length - neverSignedInCount,
    neverSignedInCount,

    query,
    setQuery,
    isFilteredEmpty: rows.length > 0 && filtered.length === 0,

    isLoading: result.isLoading,
    isRefreshing: result.isFetching && !result.isLoading,
    error: result.error ? toPresentableError(result.error) : null,
    refetch: () => void result.refetch(),
  };
}
