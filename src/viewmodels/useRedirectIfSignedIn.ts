"use client";
// ============================================================================
// VIEWMODEL LAYER — "you're already signed in" guard.
//
// Landing on a sign-in page with a live session should not present a login
// form. Both doors and the landing page need this, so it lives here instead of
// being re-implemented as an effect in each page.
//
// Returns whether the View should render a placeholder instead of its content —
// true while the session is still resolving, and true once a redirect is in
// flight, so the form never flashes in front of an authenticated user.
// ============================================================================
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./useSession";
import { postLoginDestination } from "./authRoutes";
import { isStaffRole } from "@/models/types";

export function useRedirectIfSignedIn(): { isResolving: boolean } {
  const router = useRouter();
  const { user, isReady, labsReady } = useSession();

  useEffect(() => {
    if (!isReady || !user) return;
    // Staff still wait for their labs to resolve, even though there is no
    // picker any more: the dashboard is lab-scoped, and navigating before the
    // active lab is known shows a moment of unscoped data.
    const isStaff = isStaffRole(user.role);
    if (isStaff && !labsReady) return;
    router.replace(postLoginDestination(user.role, user.githubLogin));
  }, [isReady, labsReady, router, user]);

  return { isResolving: !isReady || Boolean(user) };
}
