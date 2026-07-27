"use client";
// ============================================================================
// VIEWMODEL LAYER — Landing role switcher (mock SSO)
// Best-effort loads seeded users so the landing page can show real persona
// cards grouped by role. If the backend is unreachable the View falls back to
// generic role cards and logs in by role instead of userId.
// ============================================================================
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/models/api";
import type { SystemUser, UserRole } from "@/models/types";
import { toPresentableError, type PresentableError } from "./errors";

export interface RoleSwitcherVM {
  usersByRole: Record<UserRole, SystemUser[]>;
  isLoading: boolean;
  error: PresentableError | null;
  hasUsers: boolean;
}

const EMPTY: Record<UserRole, SystemUser[]> = {
  TEACHER: [],
  STUDENT: [],
  ADMIN: [],
  SUPER_ADMIN: [],
};

export function useRoleSwitcher(): RoleSwitcherVM {
  const query = useQuery({
    queryKey: ["users", "all-for-landing"],
    queryFn: () => usersApi.list(),
    retry: false, // landing must resolve fast even when backend is down
  });

  const usersByRole = useMemo<Record<UserRole, SystemUser[]>>(() => {
    const grouped: Record<UserRole, SystemUser[]> = {
      TEACHER: [],
      STUDENT: [],
      ADMIN: [],
      SUPER_ADMIN: [],
    };
    for (const user of query.data ?? []) {
      if (user.status !== "ACTIVE") continue;
      grouped[user.role].push(user);
    }
    return grouped;
  }, [query.data]);

  const hasUsers = (query.data?.length ?? 0) > 0;

  return {
    usersByRole: query.data ? usersByRole : EMPTY,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    hasUsers,
  };
}
