"use client";
// ============================================================================
// VIEWMODEL LAYER — Session
// Two auth paths (ADDENDUM B/I/J):
//   • FACULTY & IT STAFF (TEACHER/ADMIN) — real GitHub OAuth. `loginWithGithub()`
//     navigates the browser to the backend start URL; after the redirect dance
//     the cookie session is validated by me(). The role comes from GitHub team.
//   • STUDENTS — mock system-account login via loginAs({ userId }). No mock
//     path exists for staff anymore.
// On mount we call me() (credentials are always included by the client) to
// resolve whichever session exists. A 401 (or any HTTP error) means logged out;
// a network error keeps the optimistic localStorage user so the demo still
// renders. Views consume this via useSession(); they never touch the API client.
// ============================================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, setToken, ApiError } from "@/models/api";
import type { AccessibleLab, SystemUser, UserRole } from "@/models/types";

const USER_STORAGE_KEY = "alphaci.user";

interface SessionState {
  user: SystemUser | null;
  isReady: boolean; // initial me() resolution finished
  isLoading: boolean; // a mock-login call is in flight
  error: string | null;
  /** Teacher path — full-page redirect to GitHub OAuth. */
  loginWithGithub: () => void;
  /** Student / admin path — mock system-account login. */
  loginAs: (
    payload: { userId: string } | { role: UserRole },
  ) => Promise<SystemUser | null>;
  logout: () => void;
  /** true when the current user authenticated via GitHub (teacher). */
  isGithubSession: boolean;

  // ADDENDUM K — multi-lab (multi-org).
  /** Labs (orgs) the signed-in staff user may work in. */
  labs: AccessibleLab[];
  /** The active lab id (null until picked, or for non-staff). */
  selectedOrgId: string | null;
  /** true once the labs fetch has resolved (so guards don't fire early). */
  labsReady: boolean;
  /** true when the user must pick a lab before their dashboard is meaningful. */
  needsLabSelection: boolean;
  /** Set the active lab for this session, then refresh local state. */
  selectLab: (orgId: string) => Promise<void>;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

function readStoredUser(): SystemUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SystemUser) : null;
  } catch {
    return null;
  }
}

function persistUser(user: SystemUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ADDENDUM K — multi-lab.
  const [labs, setLabs] = useState<AccessibleLab[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [labsReady, setLabsReady] = useState(false);

  // On mount: optimistically hydrate from localStorage, then validate via me().
  // For a staff session (TEACHER/ADMIN) also load the labs they can work in.
  useEffect(() => {
    let cancelled = false;
    setUser(readStoredUser());

    (async () => {
      try {
        const me = await authApi.me();
        if (cancelled) return;
        persistUser(me);
        setUser(me);

        if (me.role === "TEACHER" || me.role === "ADMIN") {
          try {
            const res = await authApi.labs();
            if (!cancelled) {
              setLabs(res.labs);
              setSelectedOrgId(res.selectedOrgId);
            }
          } catch {
            /* labs unavailable — treat as no labs; guards handle the empty case */
          }
        }
      } catch (err) {
        if (cancelled) return;
        // HTTP error (e.g. 401) = definitively logged out → clear.
        // Network error = backend unreachable → keep optimistic user so the
        // logged-out landing isn't shown spuriously and degraded states render.
        if (err instanceof ApiError && err.kind === "http") {
          setToken(null);
          persistUser(null);
          setUser(null);
          setLabs([]);
          setSelectedOrgId(null);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
          setLabsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectLab = useCallback<SessionState["selectLab"]>(async (orgId) => {
    const res = await authApi.selectLab(orgId);
    setLabs(res.labs);
    setSelectedOrgId(res.selectedOrgId);
  }, []);

  const loginWithGithub = useCallback(() => {
    if (typeof window !== "undefined") {
      // The backend picks the destination from the user's GitHub team
      // (/admin or /teacher); no returnTo needed on the happy path.
      window.location.assign(authApi.githubStartUrl());
    }
  }, []);

  const loginAs = useCallback<SessionState["loginAs"]>(async (payload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.mockLogin(payload);
      setToken(res.token);
      persistUser(res.user);
      setUser(res.user);
      return res.user;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to sign in. Please try again.";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Clear locally first for instant UX, then clear the server session.
    setToken(null);
    persistUser(null);
    setUser(null);
    setError(null);
    setLabs([]);
    setSelectedOrgId(null);
    void authApi.logout().catch(() => {
      /* best-effort; session may already be gone */
    });
  }, []);

  const isStaff = user?.role === "TEACHER" || user?.role === "ADMIN";
  const needsLabSelection = Boolean(
    isStaff && labsReady && labs.length > 1 && !selectedOrgId,
  );

  const value = useMemo<SessionState>(
    () => ({
      user,
      isReady,
      isLoading,
      error,
      loginWithGithub,
      loginAs,
      logout,
      // ADDENDUM I — GitHub-authenticated staff (TEACHER or ADMIN) all carry a
      // real githubLogin; mock students/admins don't. This is what tells a
      // GitHub admin apart from a mock-switcher admin.
      isGithubSession: Boolean(user?.githubLogin),
      // ADDENDUM K — multi-lab.
      labs,
      selectedOrgId,
      labsReady,
      needsLabSelection,
      selectLab,
    }),
    [
      user,
      isReady,
      isLoading,
      error,
      loginWithGithub,
      loginAs,
      logout,
      labs,
      selectedOrgId,
      labsReady,
      needsLabSelection,
      selectLab,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
