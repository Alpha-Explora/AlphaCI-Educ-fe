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
import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr/SealCheck";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { Banner, Spinner } from "@/components/ui";
import { AuthShell, type AuthHighlight } from "@/components/auth/AuthShell";
import { CredentialsForm } from "@/components/auth/CredentialsForm";
import { brand } from "@/config/brand";
import { useSignIn } from "@/viewmodels/useSignIn";
import { useAuthNotice } from "@/viewmodels/useAuthNotice";
import { useRedirectIfSignedIn } from "@/viewmodels/useRedirectIfSignedIn";

// Deliberately role-neutral: one page serves a 14-year-old and an IT director,
// so the copy promises what the platform does rather than what any one role
// gets. Role-specific reassurance now lives on the dashboards themselves.
const HIGHLIGHTS: AuthHighlight[] = [
  {
    icon: UserCircleIcon,
    title: "One account, one sign-in",
    body: "Students, teachers and IT staff all use the same school email and password.",
  },
  {
    icon: SealCheckIcon,
    title: "Work checked automatically",
    body: "Every push runs the tests and reports exactly which cases passed.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Access matches your role",
    body: "What you can see and do is decided after you sign in. Nothing to configure.",
  },
];

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
      subheading="Sign in with your school email address and password."
      highlights={HIGHLIGHTS}
      footer={
        <p>
          Don&rsquo;t have an account yet? Accounts are created for you — students
          by their teacher, staff by their IT admin. Ask them which address they
          used, then use{" "}
          <span className="font-medium text-[var(--text-strong)]">
            Forgot password
          </span>{" "}
          to set your own.
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
