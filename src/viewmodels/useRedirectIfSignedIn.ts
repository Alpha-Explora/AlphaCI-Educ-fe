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
  const { user, isReady, labsReady, needsLabSelection } = useSession();

  useEffect(() => {
    if (!isReady || !user) return;
    // Staff need their labs resolved first, or we'd send a multi-lab teacher to
    // a dashboard scoped to no lab and immediately bounce her out again.
    const isStaff = isStaffRole(user.role);
    if (isStaff && !labsReady) return;
    router.replace(
      postLoginDestination(user.role, needsLabSelection, user.githubLogin),
    );
  }, [isReady, labsReady, needsLabSelection, router, user]);

  return { isResolving: !isReady || Boolean(user) };
}
