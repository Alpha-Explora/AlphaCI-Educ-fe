"use client";
// ============================================================================
// VIEW LAYER — STUDENT sign in (/signin)
//
// The student door. Staff have their own at /signin/staff — see the long note
// in viewmodels/authRoutes.ts for why the split exists when the credential
// mechanism is identical. The short version: a student's account is
// self-registered and gated on the school's email domain, a staff account is
// created by an IT admin at any address at all, and no single page can tell
// both of those stories without one of them reading as a rule the other is
// about to break.
//
// This route keeps the bare /signin path because it serves the larger audience
// and because it is where every role-less redirect lands (an expired session, a
// guard bouncing an anonymous visitor). A staff member who arrives here is one
// click away: the footer links out, and a staff password typed into this form
// is refused with a link rather than silently accepted.
//
// GitHub is deliberately absent. It is no longer a way to log in — staff link
// it once AFTER signing in (see /connect-github), and only then does GitHub
// Team membership decide their real role. Putting a "Continue with GitHub"
// button here would reopen the door this design closed.
//
// Presentation only: useSignIn owns fields, validation, failure copy, and the
// post-login destination.
// ============================================================================
import Link from "next/link";
import { Banner, Spinner } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { CredentialsForm } from "@/components/auth/CredentialsForm";
import { brand } from "@/config/brand";
import { useSignIn } from "@/viewmodels/useSignIn";
import { useAuthNotice } from "@/viewmodels/useAuthNotice";
import { useRedirectIfSignedIn } from "@/viewmodels/useRedirectIfSignedIn";
import { STAFF_SIGN_IN_ROUTE } from "@/viewmodels/authRoutes";

export default function SignInPage() {
  const { isResolving } = useRedirectIfSignedIn();
  const notice = useAuthNotice();
  const vm = useSignIn("STUDENT");

  if (isResolving) {
    return (
      <main
        id="main-content"
        className="grid min-h-dvh place-items-center bg-[var(--bg-canvas)]"
      >
        <Spinner size="lg" />
        <span className="sr-only">Checking your session…</span>
      </main>
    );
  }

  return (
    <AuthShell
      // No eyebrow: it read "ALPHA EDUC" directly under the wordmark, which
      // is a label for something the reader has already looked at.
      heading={
        <>
          Welcome back,{" "}
          <span className="text-platform-600">{brand.cohort}</span>
        </>
      }
      subheading="Use your school email and password."
      footer={
        // Two lines, and the second one is the whole point of the split.
        //
        // The first is this page's own business: a student has no account to
        // wait for, because registering IS the enrolment. The only thing they
        // can get wrong is using a personal address instead of the school's,
        // and the server names the right domain when they do — listing it here
        // as well would go stale the moment it is reconfigured.
        //
        // The second is a SIGNPOST, not an instruction, which is why it is a
        // separate sentence rather than a clause appended to the first. It used
        // to read "Staff: your IT admin creates yours, then use Forgot
        // password" — advice about a page, given on the page it was not about.
        // A teacher following it landed back here with a fresh password and the
        // same student-shaped screen.
        <div className="space-y-2">
          <p>
            Students:{" "}
            <Link
              href="/signin/create-account"
              className="font-medium text-platform-600 underline-offset-2 hover:underline"
            >
              create an account
            </Link>{" "}
            with your school email — your workspace is set up on your first
            sign-in.
          </p>
          <p>
            Teacher or IT staff?{" "}
            <Link
              href={STAFF_SIGN_IN_ROUTE}
              className="font-medium text-platform-600 underline-offset-2 hover:underline"
            >
              Sign in here instead
            </Link>
            .
          </p>
        </div>
      }
    >
      {notice && (
        <Banner tone={notice.tone} title={notice.title} className="mb-4">
          {notice.message}
        </Banner>
      )}

      <CredentialsForm
        vm={vm}
        submitLabel="Sign in"
        wrongDoorLabel="Go to staff sign-in"
      />
    </AuthShell>
  );
}
