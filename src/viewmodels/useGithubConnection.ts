"use client";
// ============================================================================
// VIEWMODEL LAYER — GitHub connection (Settings)
//
// Answers one question honestly: can this person create repositories right now?
//
// The app used to answer it from `user.githubLogin`, which records only that a
// link happened ONCE. It cannot notice a revoked authorization, a token this
// server never stored, or a grant missing the `repo` scope — so Settings and
// /connect-github both said "GitHub is connected" while every provisioning
// attempt came back 401. This asks the backend, which asks GitHub.
//
// The View renders `tone`, `headline`, `detail` and the action; it decides
// nothing about what a state means.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/models/api";
import type { GithubConnectionStatus } from "@/models/types";
import { toPresentableError, type PresentableError } from "./errors";

export type ConnectionTone = "success" | "warning" | "error" | "neutral";

export interface GithubConnectionVM {
  isLoading: boolean;
  error: PresentableError | null;
  status: GithubConnectionStatus | null;
  /** Colour of the status pill. */
  tone: ConnectionTone;
  /** One line stating the situation. */
  headline: string;
  /** One line stating what it means, or what to do about it. */
  detail: string;
  /** Whether connecting/reconnecting is worth offering at all. */
  canConnect: boolean;
  /** Label for the action — "Connect" and "Reconnect" are different promises. */
  actionLabel: string;
  /** Start the OAuth handshake (full-page redirect, not a fetch). */
  connect: () => void;
  /** Re-verify without reconnecting — for "I just fixed it on GitHub". */
  recheck: () => void;
  isChecking: boolean;
}

/** What each state means, in one place, in the teacher's words. */
function describe(status: GithubConnectionStatus): {
  tone: ConnectionTone;
  headline: string;
  detail: string;
  canConnect: boolean;
  actionLabel: string;
} {
  switch (status.state) {
    case "connected":
      return status.canCreateRepos
        ? {
            tone: "success",
            headline: `Connected as @${status.login}`,
            // Said explicitly because the whole problem was a connection that
            // silently did not survive signing out.
            detail:
              "This connection is saved on the server and stays active across sign-ins. You will not be asked to connect again unless you revoke it on GitHub.",
            canConnect: true,
            actionLabel: "Reconnect",
          }
        : {
            tone: "warning",
            headline: `Connected as @${status.login}, but missing repository access`,
            // A valid token that cannot create repos is the most confusing
            // failure of all, because everything else looks healthy.
            detail:
              "GitHub accepted the connection, but it was not granted the “repo” permission, so repositories cannot be created. Reconnect and approve repository access.",
            canConnect: true,
            actionLabel: "Reconnect",
          };

    case "credential_missing":
      return {
        tone: "warning",
        headline: `Linked to @${status.login}, but not usable on this server`,
        detail:
          "Your GitHub account is on your profile, but this server holds no active connection for it — usually because it was linked before this feature existed. Connect once more and it will persist from then on.",
        canConnect: true,
        actionLabel: "Connect GitHub",
      };

    case "revoked":
      return {
        tone: "error",
        headline: "GitHub has revoked this connection",
        detail:
          "GitHub no longer accepts the saved connection — it was withdrawn or expired. Reconnect to restore it.",
        canConnect: true,
        actionLabel: "Reconnect",
      };

    case "never_connected":
      return {
        tone: "neutral",
        headline: "Not connected",
        detail:
          "Creating student repositories uses your own GitHub account. Connect once and it stays connected.",
        canConnect: true,
        actionLabel: "Connect GitHub",
      };

    case "unconfigured":
      return {
        tone: "neutral",
        headline: "GitHub is not set up on this server",
        // Nothing the teacher can do — offering a button would be a dead end.
        detail:
          "Repositories will be simulated rather than created for real. Your IT administrator configures this.",
        canConnect: false,
        actionLabel: "",
      };

    case "check_failed":
      return {
        tone: "warning",
        headline: "Could not check your connection",
        // NOT reported as disconnected: we genuinely do not know, and guessing
        // wrong in either direction is how this whole problem started.
        detail:
          "GitHub could not be reached just now, so the status is unknown. Try again in a moment.",
        canConnect: true,
        actionLabel: "Reconnect",
      };

    case "not_applicable":
    default:
      return {
        tone: "neutral",
        headline: "Not applicable",
        detail: "Student accounts do not use a GitHub connection.",
        canConnect: false,
        actionLabel: "",
      };
  }
}

export function useGithubConnection(): GithubConnectionVM {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["auth", "github-status"],
    queryFn: () => authApi.githubStatus(),
    // The backend caches the verified answer for a minute; matching that here
    // keeps a revisit instant without ever showing a stale verdict for long.
    staleTime: 60_000,
    retry: false,
  });

  const recheckMutation = useMutation({
    mutationFn: () => authApi.githubStatus(),
    onSuccess: (fresh) => queryClient.setQueryData(["auth", "github-status"], fresh),
  });

  const status = query.data ?? null;
  const described = status
    ? describe(status)
    : {
        tone: "neutral" as ConnectionTone,
        headline: "Checking your GitHub connection…",
        detail: "",
        canConnect: false,
        actionLabel: "",
      };

  return {
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    status,
    ...described,
    connect: () => {
      // Full-page navigation: OAuth is a browser redirect, not a fetch. The
      // backend attaches the result to the session this request carries.
      window.location.href = authApi.githubStartUrl("/teacher/settings");
    },
    recheck: () => recheckMutation.mutate(),
    isChecking: query.isFetching || recheckMutation.isPending,
  };
}
