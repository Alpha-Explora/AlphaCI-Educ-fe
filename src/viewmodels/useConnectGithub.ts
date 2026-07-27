"use client";
// ============================================================================
// VIEWMODEL LAYER — Connect GitHub (/connect-github)
//
// The step that replaced "sign in with GitHub". The person is ALREADY
// authenticated by email + password; this hook decides whether they still need
// to attach a GitHub identity, starts the OAuth handshake, and routes them on
// once it lands.
//
// Owns every rule on this screen: who belongs here, who is bounced away, and
// where "skip" is allowed to lead. The View renders copy and two buttons.
// ============================================================================
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./useSession";
import { destinationFor, SIGN_IN_ROUTE } from "./authRoutes";

export interface ConnectGithubVM {
  /** Hold the View until we know the session; prevents a flash of the wrong copy. */
  isResolving: boolean;
  fullName: string;
  email: string;
  /** Already linked — the screen becomes a confirmation rather than a prompt. */
  isLinked: boolean;
  linkedLogin: string | null;
  /** Begin the OAuth handshake (full-page redirect, not a fetch). */
  connect: () => void;
  /** Continue without linking, into whatever the profile role already allows. */
  skip: () => void;
  /** Where `skip` leads, so the View can name it honestly. */
  skipDestination: string;
}

export function useConnectGithub(): ConnectGithubVM {
  const router = useRouter();
  const { user, isReady, labsReady, needsLabSelection, loginWithGithub } = useSession();

  const linked = Boolean(user?.githubLogin);

  // Two groups have no business here and are sent away rather than shown a
  // screen they cannot act on: nobody signed in, and students (zero-footprint —
  // they hold no GitHub identity by design).
  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace(SIGN_IN_ROUTE);
      return;
    }
    if (user.role === "STUDENT") router.replace(destinationFor(user.role));
  }, [isReady, user, router]);

  const connect = useCallback(() => {
    // Full-page redirect to GitHub. The backend attaches the result to the
    // CURRENT session, which is why signing in has to happen first.
    loginWithGithub();
  }, [loginWithGithub]);

  // Deliberately NOT postLoginDestination: that function routes people TO this
  // screen when they are unlinked, so calling it here would bounce them back and
  // make "skip" a no-op. Skipping means "go on with the role I already have".
  let skipDestination = SIGN_IN_ROUTE;
  if (user) skipDestination = needsLabSelection ? "/select-lab" : destinationFor(user.role);

  const skip = useCallback(() => {
    router.replace(skipDestination);
  }, [router, skipDestination]);

  return {
    isResolving: !isReady || !user || user.role === "STUDENT" || !labsReady,
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    isLinked: linked,
    linkedLogin: user?.githubLogin ?? null,
    connect,
    skip,
    skipDestination,
  };
}
