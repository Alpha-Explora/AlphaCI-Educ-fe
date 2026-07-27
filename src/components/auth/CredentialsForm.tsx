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
import { useId, useState } from "react";
import Link from "next/link";
import { Banner, Button, Input } from "@/components/ui";
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
  const [showPassword, setShowPassword] = useState(false);

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

      {/* --- Password ---------------------------------------------------- */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={passwordId}
            className="block text-sm font-medium text-[var(--text-strong)]"
          >
            Password
          </label>
          {forgotHref && (
            <Link
              href={forgotHref}
              className="rounded text-xs font-medium text-platform-600 underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <div className="relative">
          <Input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            value={vm.password}
            onChange={(e) => vm.setPassword(e.target.value)}
            onBlur={() => vm.markTouched("password")}
            disabled={vm.isSubmitting}
            autoComplete="current-password"
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? `${passwordId}-error` : undefined}
            className={passwordError ? "border-danger pr-16" : "pr-16"}
          />
          {/*
            A show/hide toggle rather than a "reveal" icon: on a shared lab PC,
            typo-driven lockouts are the most common sign-in failure, and being
            able to check what you typed prevents most of them.
            aria-pressed communicates the current state to screen readers.
          */}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            aria-controls={passwordId}
            className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-xs font-semibold text-platform-600 hover:text-platform-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {passwordError && (
          <p id={`${passwordId}-error`} className="text-xs text-danger">
            {passwordError}
          </p>
        )}
      </div>

      <Button type="submit" loading={vm.isSubmitting} className="w-full">
        {vm.isSubmitting ? "Signing you in…" : submitLabel}
      </Button>
    </form>
  );
}
