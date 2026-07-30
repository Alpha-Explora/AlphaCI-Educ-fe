"use client";
// ============================================================================
// VIEWMODEL LAYER — Session
// ONE auth path: email + password, for every role (`loginWithPassword`).
//
// `loginWithGithub()` is NOT a login despite the name — it starts the GitHub
// LINK flow from /connect-github, attaching a GitHub identity to the session
// that already exists. The backend refuses it outright when nobody is signed in.
// Staff roles are re-resolved from Team membership at that moment.
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
import { isStaffRole } from "@/models/types";
import type {
  AccessibleLab,
  PasswordLoginRequest,
  SystemUser,
} from "@/models/types";

const USER_STORAGE_KEY = "alphaci.user";

/**
 * What a completed sign-in yields.
 *
 * Just the user now. This used to also carry `needsLabSelection`, which existed
 * only to route a multi-lab staff member to a picker screen; the backend
 * auto-selects a lab and that screen is gone, so the caller has one destination
 * to compute instead of two.
 */
export interface SignInResult {
  user: SystemUser;
}

interface SessionState {
  user: SystemUser | null;
  isReady: boolean; // initial me() resolution finished
  isLoading: boolean; // a sign-in call is in flight
  error: string | null;
  /**
   * Starts the GitHub ACCOUNT-LINK flow (full-page redirect). Requires an
   * existing session — this is not a way to sign in.
   */
  loginWithGithub: () => void;
  /**
   * Real credential sign-in — the only way in, for every role.
   *
   * REJECTS on failure rather than parking the message in `error`: the sign-in
   * form needs the HTTP status to choose its copy (401 wrong password, 403 a
   * refused address or deactivated account, 429 rate-limited).
   */
  loginWithPassword: (credentials: PasswordLoginRequest) => Promise<SignInResult>;
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

        if (isStaffRole(me.role)) {
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
      // Errors bounce back to the connect screen, which is the only place this
      // flow is ever started from. On success the backend picks the destination
      // from the role the team membership just granted.
      window.location.assign(authApi.githubStartUrl("/connect-github"));
    }
  }, []);

  /**
   * ADDENDUM K — after any staff sign-in, load the labs this user may work in
   * and which one the backend made active. Students have no labs, so they
   * short-circuit. A failed labs call is non-fatal: the dashboard's empty state
   * explains "no labs yet" better than a blocked sign-in would.
   */
  const loadLabsFor = useCallback(async (signedIn: SystemUser): Promise<void> => {
    if (!isStaffRole(signedIn.role)) {
      setLabs([]);
      setSelectedOrgId(null);
      return;
    }
    try {
      const res = await authApi.labs();
      setLabs(res.labs);
      setSelectedOrgId(res.selectedOrgId);
    } catch {
      setLabs([]);
      setSelectedOrgId(null);
    }
  }, []);

  const loginWithPassword = useCallback<SessionState["loginWithPassword"]>(
    async (credentials) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authApi.passwordLogin(credentials);
        // The API also establishes an httpOnly session cookie; this bearer token
        // is what keeps the existing student request path working unchanged.
        setToken(res.token);
        persistUser(res.user);
        setUser(res.user);
        await loadLabsFor(res.user);
        setLabsReady(true);
        return { user: res.user };
      } finally {
        setIsLoading(false);
      }
    },
    [loadLabsFor],
  );

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

  const value = useMemo<SessionState>(
    () => ({
      user,
      isReady,
      isLoading,
      error,
      loginWithGithub,
      loginWithPassword,
      logout,
      // Staff who have linked GitHub carry a real githubLogin. Students never
      // do — they hold no GitHub identity by design.
      isGithubSession: Boolean(user?.githubLogin),
      // ADDENDUM K — multi-lab.
      labs,
      selectedOrgId,
      labsReady,
      selectLab,
    }),
    [
      user,
      isReady,
      isLoading,
      error,
      loginWithGithub,
      loginWithPassword,
      logout,
      labs,
      selectedOrgId,
      labsReady,
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
