"use client";
// ============================================================================
// VIEWMODEL LAYER — OAuth bounce-back notices
//
// ADDENDUM I — when GitHub sign-in can't complete, the backend redirects to the
// frontend with `?auth=<reason>`. Translating those reasons into something a
// human can act on is presentation logic that belongs to a ViewModel; it used
// to be an `authNoticeFor()` switch inside src/app/page.tsx, where the two
// sign-in pages could not share it.
//
// Every message names the fix, not just the failure — "ask an IT Admin to add
// you to the Teacher team" is actionable, "not authorized" is not.
// ============================================================================
import { useEffect, useState } from "react";
import { brand } from "@/config/brand";

/** The `?auth=` reasons the backend can bounce back with. */
export type AuthNoticeReason =
  | "not_authorized"
  | "unavailable"
  | "invalid_state"
  | "failed"
  | "session_expired"
  | "signin_first"
  | "students_no_github"
  | "github_already_linked"
  | "github_mismatch"
  | "invite_pending";

export interface AuthNotice {
  /** The machine-readable cause. Views branch on THIS, never on the copy. */
  reason: AuthNoticeReason;
  tone: "warning" | "error" | "info";
  title: string;
  message: string;
}

const NOTICES: Record<AuthNoticeReason, Omit<AuthNotice, "reason">> = {
  not_authorized: {
    tone: "warning",
    title: "That GitHub account isn't on a staff team yet",
    message:
      "We connected to GitHub, but the account isn't on the IT-Staff, Teacher or platform team, so there's no access for it to grant. We haven't saved the connection — ask an IT Admin to add you to the right team, then try again.",
  },
  signin_first: {
    tone: "info",
    title: "Sign in first",
    message:
      "Connecting GitHub attaches it to your existing account, so you need to be signed in before you start. Sign in with your email and password, then try again.",
  },
  students_no_github: {
    tone: "info",
    title: "Students don't need GitHub",
    message:
      "Your work is managed for you — there's no GitHub account to connect. Head back to your dashboard.",
  },
  invite_pending: {
    tone: "warning",
    title: "Accept your invitation first",
    message:
      "We connected to GitHub, but that account isn't showing up on your school's team yet — which usually means the organization invitation is still waiting in your email. Accept it on GitHub, then come back and connect again.",
  },
  github_mismatch: {
    tone: "error",
    title: "That's not the GitHub account you were invited with",
    message:
      "Your admin recorded a specific GitHub username for you, and this isn't it. Sign in to GitHub as the invited account and try again, or ask your admin to update the username on your profile.",
  },
  github_already_linked: {
    tone: "error",
    title: "That GitHub account is already connected",
    message:
      `Another ${brand.name} account is already using this GitHub account. Sign in as that account instead, or ask an IT Admin to disconnect it first.`,
  },
  unavailable: {
    tone: "info",
    title: "GitHub isn't set up on this server",
    message:
      "No GitHub app is configured here, so there's nothing to connect to yet. You can keep working with the access your account already has.",
  },
  invalid_state: {
    tone: "error",
    title: "That didn't complete",
    message:
      "The link expired or was opened in a different browser. Please start again.",
  },
  failed: {
    tone: "error",
    title: "That didn't complete",
    message: "Something went wrong talking to GitHub. Please try again.",
  },
  session_expired: {
    tone: "info",
    title: "You were signed out",
    message: "Your session expired for security. Sign in again to pick up where you left off.",
  },
};

/**
 * Reads `?auth=<reason>` once on mount and returns the matching notice.
 *
 * Deliberately effect-based rather than useSearchParams(): reading the query
 * string during render would opt this subtree into Suspense/CSR bailout under
 * the App Router, and a notice banner is not worth that. Returns null until
 * mounted, which also keeps SSR and first client render identical.
 */
export function useAuthNotice(): AuthNotice | null {
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("auth");
    if (!raw) return;
    const reason = raw as AuthNoticeReason;
    const match = NOTICES[reason];
    // An unrecognised ?auth= value shows nothing rather than an empty banner —
    // the query string is user-editable, so it can say anything.
    if (match) setNotice({ reason, ...match });
  }, []);

  return notice;
}
