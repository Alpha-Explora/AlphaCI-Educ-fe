"use client";
// ============================================================================
// VIEW LAYER — Set a new password (/auth/reset-password)
//
// Where password-reset AND staff-invitation emails land. The path is not
// arbitrary: it is what the server already tells Supabase to redirect to
// (SUPABASE_PASSWORD_RESET_REDIRECT, defaulting to `${frontendUrl}/auth/reset-password`).
// Until this page existed, both emails sent people to a 404 — so an IT admin
// could invite a teacher, the teacher would get the email, and the flow ended
// there.
//
// Sits under /auth rather than /signin because it is reached from an email
// rather than from the sign-in screens, and because that is the path already
// configured. It still wears AuthShell so it belongs to the same flow visually.
//
// One page for every role. A teacher accepting an invitation, an IT admin
// accepting one, and a student resetting all arrive with the same kind of
// token — only the wording differs, and only because "set your password" and
// "reset your password" are different sentences to the person reading them.
// ============================================================================
import { useId } from "react";
import Link from "next/link";
import { Banner, Button } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { useResetPassword } from "@/viewmodels/useResetPassword";
import { SIGN_IN_ROUTES } from "@/viewmodels/authRoutes";

export default function ResetPasswordPage() {
  const vm = useResetPassword();
  const passwordId = useId();
  const confirmId = useId();

  const isInvite = vm.link.kind === "ready" && vm.link.isInvite;

  // Three states, three sentences. An invitation and a reset are the same
  // mechanism but not the same experience: one person is joining, the other is
  // recovering, and "reset your password" reads oddly to someone who never had
  // one.
  let heading = "Set a new password";
  let subheading = "Pick something you have not used here before.";

  if (vm.isSaved) {
    heading = "Password set";
    subheading = "You can sign in with it now.";
  } else if (isInvite) {
    heading = "Choose your password";
    subheading = "This is the last step of your invitation.";
  }

  return (
    <AuthShell
      eyebrow="Account access"
      heading={heading}
      subheading={vm.link.kind === "checking" ? "Checking your link…" : subheading}
      footer={
        <p>
          <Link
            href={SIGN_IN_ROUTES.staff}
            className="font-medium text-platform-600 underline-offset-2 hover:underline"
          >
            Staff sign-in
          </Link>
          <span aria-hidden="true" className="mx-2">
            ·
          </span>
          <Link
            href={SIGN_IN_ROUTES.student}
            className="font-medium text-platform-600 underline-offset-2 hover:underline"
          >
            Student sign-in
          </Link>
        </p>
      }
    >
      {/* Reading the fragment needs the browser, so there is a beat before we
          know whether the link is usable. Saying nothing definite yet beats
          flashing an error at someone whose link is perfectly fine. */}
      {vm.link.kind === "checking" && (
        <p className="text-sm text-slate-500">One moment…</p>
      )}

      {vm.link.kind === "unusable" && (
        <div className="space-y-4">
          <Banner tone="error" title="This link cannot be used">
            {vm.link.reason}
          </Banner>
          <p className="text-sm text-slate-600">
            These links expire and can only be used once. Request a new one and
            open the most recent email.
          </p>
          <Link
            href="/signin/forgot-password"
            className="inline-block text-sm font-medium text-platform-600 underline-offset-2 hover:underline"
          >
            Send me a new link
          </Link>
        </div>
      )}

      {vm.link.kind === "ready" && vm.isSaved && (
        <div className="space-y-4">
          <Banner tone="success" title="Your password is set">
            Sign in with your email address and the password you just chose.
          </Banner>
          {/* Staff and students sign in at different doors, and someone
              arriving from an invitation has no reason to know which is
              theirs — so offer both rather than guessing. */}
          <p className="text-sm text-slate-600">
            <Link
              href={SIGN_IN_ROUTES.staff}
              className="font-medium text-platform-600 underline-offset-2 hover:underline"
            >
              Staff sign-in
            </Link>
            <span aria-hidden="true" className="mx-2">
              ·
            </span>
            <Link
              href={SIGN_IN_ROUTES.student}
              className="font-medium text-platform-600 underline-offset-2 hover:underline"
            >
              Student sign-in
            </Link>
          </p>
        </div>
      )}

      {vm.link.kind === "ready" && !vm.isSaved && (
        <form onSubmit={vm.submit} noValidate className="space-y-4">
          {vm.error && <Banner tone="error">{vm.error}</Banner>}

          <PasswordField
            id={passwordId}
            label="New password"
            value={vm.password}
            onChange={vm.setPassword}
            disabled={vm.isSubmitting}
            autoComplete="new-password"
            hint="At least 8 characters."
          />

          <PasswordField
            id={confirmId}
            label="Confirm new password"
            value={vm.confirmPassword}
            onChange={vm.setConfirmPassword}
            disabled={vm.isSubmitting}
            autoComplete="new-password"
          />

          <Button type="submit" disabled={vm.isSubmitting} className="w-full">
            {vm.isSubmitting ? "Saving…" : "Save password"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
