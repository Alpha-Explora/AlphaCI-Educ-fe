"use client";
// ============================================================================
// VIEWMODEL LAYER — Set a new password
//
// Where a reset email and a staff invitation both land. Until this existed the
// server sent those links and the site had nowhere to put them, so the last
// step of both flows was a 404.
//
// WHY THE TOKEN COMES FROM THE URL FRAGMENT
//
// Supabase returns `#access_token=…&type=recovery`. A fragment is never sent to
// a server — not to Next.js, not to the API — so it can only be read here, in
// the browser, and passed on deliberately. That is also why this file cannot be
// a server component.
//
// It is read ONCE on mount and then stripped from the address bar: a
// credential sitting in a URL survives in history, in a screenshot, and in
// whatever the person pastes when they ask for help.
//
// One page covers teachers, IT admins and students. The token proves control of
// the mailbox; the account's role has no bearing on setting its own password.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { authApi, ApiError } from "@/models/api";
import { brand } from "@/config/brand";

/** What the emailed link turned out to be. */
export type ResetLinkState =
  | { kind: "checking" }
  /** A usable token. `isInvite` only changes the wording. */
  | { kind: "ready"; isInvite: boolean }
  /** No token, or Supabase said the link is expired or already spent. */
  | { kind: "unusable"; reason: string };

export interface ResetPasswordVM {
  link: ResetLinkState;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  isSaved: boolean;
  error: string | null;
  isSubmitting: boolean;
  submit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const MIN_PASSWORD_LENGTH = 8;

export function useResetPassword(): ResetPasswordVM {
  const [token, setToken] = useState<string | null>(null);
  const [link, setLink] = useState<ResetLinkState>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Supabase puts its own failures in the fragment too — an expired link
    // arrives as `#error=access_denied&error_description=…` with no token at
    // all. Reading that is what lets the page say "expired" instead of the
    // misleading "this link is missing its token".
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = fragment.get("access_token");
    const type = fragment.get("type");
    const errorDescription = fragment.get("error_description") ?? fragment.get("error");

    // Strip the credential from the address bar before anything else can
    // capture it. replaceState keeps the page and drops the history entry.
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    if (accessToken) {
      setToken(accessToken);
      setLink({ kind: "ready", isInvite: type === "invite" || type === "signup" });
      return;
    }

    setLink({
      kind: "unusable",
      reason: errorDescription
        ? // Supabase sends these plus-encoded.
          errorDescription.replace(/\+/g, " ")
        : "This link is missing its sign-in token. Open the most recent email and use the link there.",
    });
  }, []);

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      if (!token) {
        setError("This link is no longer usable. Request a new email.");
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      // Checked here rather than only on the server: a typo in a password you
      // cannot see is the one mistake this form exists to catch, and the server
      // never sees the second field at all.
      if (password !== confirmPassword) {
        setError("Those two passwords do not match.");
        return;
      }

      setIsSubmitting(true);
      void (async () => {
        try {
          const result = await authApi.completePasswordReset(token, password);
          if (result.ok) {
            setIsSaved(true);
          } else {
            // An expired or spent link. Say so where the person is looking, and
            // retire the token so the form stops offering a dead retry.
            setError(result.message);
            setToken(null);
            setLink({ kind: "unusable", reason: result.message });
          }
        } catch (err) {
          setError(
            err instanceof ApiError && err.isNetworkError
              ? `We can't reach the ${brand.name} server at ${err.baseUrl}. Try again in a moment.`
              : "We couldn't save that password. Please try again.",
          );
        } finally {
          setIsSubmitting(false);
        }
      })();
    },
    [token, password, confirmPassword],
  );

  return {
    link,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSaved,
    error,
    isSubmitting,
    submit,
  };
}
