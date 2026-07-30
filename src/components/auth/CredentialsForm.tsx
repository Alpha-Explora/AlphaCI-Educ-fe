"use client";
// ============================================================================
// VIEW LAYER — email + password form.
//
// Receives a ready-made SignInVM and renders it. It holds exactly one piece of
// state of its own — whether the password is visible — because that is a
// presentation concern the ViewModel has no business knowing about.
//
// Both sign-in doors render this identically; the difference between them is
// the surrounding copy, not the fields.
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
}: {
  vm: SignInVM;
  submitLabel?: string;
  forgotHref?: string | null;
  autoFocus?: boolean;
}) {
  const emailId = useId();
  const passwordId = useId();

  const emailError = vm.fieldErrors.email;
  const passwordError = vm.fieldErrors.password;

  return (
    <form onSubmit={vm.submit} noValidate className="space-y-4">
      {vm.formError && (
        <Banner tone={vm.isOffline ? "network" : "error"}>{vm.formError}</Banner>
      )}

      {/* --- Email ------------------------------------------------------- */}
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
          onBlur={() => vm.markTouched("email")}
          disabled={vm.isSubmitting}
          placeholder="you@school.edu"
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
