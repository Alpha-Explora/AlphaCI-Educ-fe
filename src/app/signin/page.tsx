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
        // Was five lines explaining who creates accounts for whom. Nobody at a
        // sign-in prompt needs the org chart; they need to know it is not their
        // job, and what to press.
        <p>
          No account? Your teacher or IT admin makes it. Then use{" "}
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
