"use client";
// ============================================================================
// VIEW LAYER — Sign in (/signin)
//
// ONE door for every role. Students, teachers, IT admins and platform operators
// all authenticate with the email address their school issued and a password.
//
// GitHub is deliberately absent from this page. It is no longer a way to log
// in — staff link it once AFTER signing in (see /connect-github), and only then
// does GitHub Team membership decide their real role. Putting a "Continue with
// GitHub" button here would reopen the second door this design closed.
//
// Presentation only: useSignIn owns fields, validation, failure copy, and the
// post-login destination.
// ============================================================================
import { Banner, Spinner } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { CredentialsForm } from "@/components/auth/CredentialsForm";
import { brand } from "@/config/brand";
import { useSignIn } from "@/viewmodels/useSignIn";
import { useAuthNotice } from "@/viewmodels/useAuthNotice";
import { useRedirectIfSignedIn } from "@/viewmodels/useRedirectIfSignedIn";

export default function SignInPage() {
  const { isResolving } = useRedirectIfSignedIn();
  const notice = useAuthNotice();
  const vm = useSignIn();

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
        // Two audiences, one line each, because the answer to "I have no
        // account" now differs by who is asking. A student does not have one to
        // wait for — signing in IS the enrolment, so the only thing they can get
        // wrong is using a personal address instead of their school one. If they
        // do, the server says so by name; there is no point listing the domain
        // here as well, where it would go stale the moment it is reconfigured.
        <p>
          Students: sign in with your school email — your account is set up on
          your first sign-in. Staff: your IT admin creates yours, then use{" "}
          <span className="font-medium text-[var(--text-strong)]">
            Forgot password
          </span>
          .
        </p>
      }
    >
      {notice && (
        <Banner tone={notice.tone} title={notice.title} className="mb-4">
          {notice.message}
        </Banner>
      )}

      <CredentialsForm vm={vm} submitLabel="Sign in" />
    </AuthShell>
  );
}
