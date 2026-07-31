"use client";
// ============================================================================
// VIEW LAYER — email + password form.
//
// Receives a ready-made SignInVM and renders it. It holds exactly one piece of
// state of its own — whether the password is visible — because that is a
// presentation concern the ViewModel has no business knowing about.
//
// Both sign-in doors render this component. The FIELDS are identical because
// the mechanism is identical; what the doors differ on is what the email field
// is CALLED, which is not cosmetic:
//
//   • "School email" is right for a student, whose address is issued by the
//     school and checked against its domain before an account can exist.
//   • It is wrong for staff, who are invited by an IT admin at whatever address
//     that admin typed. Telling a teacher whose address is a personal or
//     district one to enter her "school email" describes a thing she does not
//     have, and reads as a rule she is about to fail.
// ============================================================================
import { useId } from "react";
import Link from "next/link";
import { Banner, Button, Input } from "@/components/ui";
import { PasswordField } from "./PasswordField";
import type { SignInVM } from "@/viewmodels/useSignIn";

export function CredentialsForm({
  vm,
  submitLabel = "Sign in",
  /** Shown under the password field. Omitted on the staff door. */
  forgotHref = "/signin/forgot-password",
  autoFocus = true,
  /** Defaults to the student wording — see the note at the top of this file. */
  emailLabel = "School email",
  emailPlaceholder = "you@school.edu",
  /**
   * Rendered inside the error banner when the API says these credentials belong
   * at the OTHER door. Omit it and the banner still explains the problem in
   * words; this only turns those words into one click.
   */
  wrongDoorLabel = "Go to the other sign-in page",
}: {
  vm: SignInVM;
  submitLabel?: string;
  forgotHref?: string | null;
  autoFocus?: boolean;
  emailLabel?: string;
  emailPlaceholder?: string;
  wrongDoorLabel?: string;
}) {
  const emailId = useId();
  const passwordId = useId();

  const emailError = vm.fieldErrors.email;
  const passwordError = vm.fieldErrors.password;

  return (
    <form onSubmit={vm.submit} noValidate className="space-y-4">
      {vm.formError && (
        <Banner tone={vm.isOffline ? "network" : "error"}>
          {vm.formError}
          {/* The banner already says which page to use. This makes it
              reachable without reading the sentence twice and hunting the
              footer for a link that matches it. */}
          {vm.wrongDoorRoute && (
            <Link
              href={vm.wrongDoorRoute}
              className="mt-2 block font-medium text-platform-700 underline underline-offset-2"
            >
              {wrongDoorLabel}
            </Link>
          )}
        </Banner>
      )}

      {/* --- Email ------------------------------------------------------- */}
      <div className="space-y-1.5">
        <label
          htmlFor={emailId}
          className="block text-sm font-medium text-[var(--text-strong)]"
        >
          {emailLabel}
        </label>
        <Input
          id={emailId}
          type="email"
          value={vm.email}
          onChange={(e) => vm.setEmail(e.target.value)}
          onBlur={() => vm.markTouched("email")}
          disabled={vm.isSubmitting}
          placeholder={emailPlaceholder}
          // `username` (not `email`) so password managers offer the saved pair.
          autoComplete="username"
          // Suppresses phone keyboards' auto-capitalisation, which silently
          // breaks the first character of a typed address on tablets.
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          autoFocus={autoFocus}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${emailId}-error` : undefined}
          className={emailError ? "border-danger" : undefined}
        />
        {emailError && (
          <p id={`${emailId}-error`} className="text-xs text-danger">
            {emailError}
          </p>
        )}
      </div>

      {/* --- Password ----------------------------------------------------
          The reveal toggle moved into PasswordField, shared with account
          creation. It was a Show/Hide label here; the reasoning for HAVING a
          toggle (shared lab PCs, typo-driven lockouts) is unchanged and now
          lives with the component. */}
      <PasswordField
        id={passwordId}
        label="Password"
        value={vm.password}
        onChange={vm.setPassword}
        onBlur={() => vm.markTouched("password")}
        disabled={vm.isSubmitting}
        autoComplete="current-password"
        error={passwordError}
        labelAction={
          forgotHref && (
            <Link
              href={forgotHref}
              className="rounded text-xs font-medium text-platform-600 underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          )
        }
      />

      <Button type="submit" loading={vm.isSubmitting} className="w-full">
        {vm.isSubmitting ? "Signing you in…" : submitLabel}
      </Button>
    </form>
  );
}
