"use client";
// ============================================================================
// VIEW LAYER — Forgot password (/signin/forgot-password)
//
// Sends a Supabase Auth reset email. Reuses AuthShell so it is visually part of
// the sign-in flow rather than a stray utility page.
// ============================================================================
import { useId } from "react";
import Link from "next/link";
import { Banner, Button, Input } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { useForgotPassword } from "@/viewmodels/useForgotPassword";
import { SIGN_IN_ROUTES } from "@/viewmodels/authRoutes";

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
          : "Enter the email you sign in with."
      }
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
          Open the link to choose a new password. It expires shortly; request
          another if it goes stale.
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
