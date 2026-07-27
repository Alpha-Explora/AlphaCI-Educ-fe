"use client";
// ============================================================================
// VIEW LAYER — Forgot password (/signin/forgot-password)
//
// Sends a Supabase Auth reset email. Reuses AuthShell so it is visually part of
// the sign-in flow rather than a stray utility page.
// ============================================================================
import { useId } from "react";
import Link from "next/link";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { HandWavingIcon } from "@phosphor-icons/react/dist/ssr/HandWaving";
import { Banner, Button, Input } from "@/components/ui";
import { AuthShell, type AuthHighlight } from "@/components/auth/AuthShell";
import { useForgotPassword } from "@/viewmodels/useForgotPassword";
import { SIGN_IN_ROUTES } from "@/viewmodels/authRoutes";

const HIGHLIGHTS: AuthHighlight[] = [
  {
    icon: EnvelopeSimpleIcon,
    title: "Check your school inbox",
    body: "The reset link arrives in a minute or two and is valid for one use.",
  },
  {
    icon: LockKeyIcon,
    title: "Your work is untouched",
    body: "Resetting a password never affects your repositories, grades, or submissions.",
  },
  {
    icon: HandWavingIcon,
    title: "Still stuck?",
    body: "Your teacher can re-send an invite, and IT staff can reset it for you.",
  },
];

export default function ForgotPasswordPage() {
  const vm = useForgotPassword();
  const emailId = useId();

  return (
    <AuthShell
      eyebrow="Password help"
      heading={vm.isSent ? "Check your email" : "Reset your password"}
      subheading={
        vm.isSent
          ? "If that address is on file, a reset link is on its way."
          : "Enter the email you sign in with and we'll send you a link to set a new password."
      }
      highlights={HIGHLIGHTS}
      footer={
        <p>
          <Link
            href={SIGN_IN_ROUTES.student}
            className="font-medium text-platform-600 underline-offset-2 hover:underline"
          >
            Back to student sign-in
          </Link>
          <span aria-hidden="true" className="mx-2">
            ·
          </span>
          <Link
            href={SIGN_IN_ROUTES.staff}
            className="font-medium text-platform-600 underline-offset-2 hover:underline"
          >
            Staff sign-in
          </Link>
        </p>
      }
    >
      {vm.isSent ? (
        // Deliberately does NOT confirm the address exists — see the note in
        // useForgotPassword about roster enumeration.
        <Banner tone="success" title="Reset link sent">
          Open the link in the email to choose a new password. It expires shortly, so
          if it&rsquo;s already stale just request another one.
        </Banner>
      ) : (
        <form onSubmit={vm.submit} noValidate className="space-y-4">
          {vm.error && <Banner tone="error">{vm.error}</Banner>}

          <div className="space-y-1.5">
            <label
              htmlFor={emailId}
              className="block text-sm font-medium text-[var(--text-strong)]"
            >
              School email
            </label>
            <Input
              id={emailId}
              type="email"
              value={vm.email}
              onChange={(e) => vm.setEmail(e.target.value)}
              disabled={vm.isSubmitting}
              placeholder="you@school.edu"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              autoFocus
            />
          </div>

          <Button type="submit" loading={vm.isSubmitting} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
