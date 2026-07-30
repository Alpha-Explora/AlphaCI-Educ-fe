"use client";
// ============================================================================
// VIEW LAYER — Student account creation (/signin/create-account)
//
// Students are not invited and not rostered by hand: they arrive with a school
// email address and register themselves. This page is where that happens, and
// it is the only route by which a student can obtain credentials at all — staff
// still arrive through the invite chain.
//
// A separate page rather than a tab on the sign-in form, matching
// /signin/forgot-password: the sign-in box stays a single-purpose thing that
// most people use most of the time, and this is a once-per-student detour.
// ============================================================================
import { useId } from "react";
import Link from "next/link";
import { Banner, Button, Input } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { useStudentSignup } from "@/viewmodels/useStudentSignup";
import { SIGN_IN_ROUTE } from "@/viewmodels/authRoutes";

export default function CreateAccountPage() {
  const vm = useStudentSignup();
  const emailId = useId();
  const passwordId = useId();

  return (
    <AuthShell
      eyebrow="New student"
      heading={vm.isCreated ? "Almost there" : "Create your account"}
      subheading={
        vm.isCreated
          ? "One more step before you can sign in."
          : "Use your school email address. Your teacher does not need to add you first."
      }
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href={SIGN_IN_ROUTE}
            className="font-medium text-platform-600 underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      {vm.isCreated ? (
        <Banner
          tone="success"
          title={vm.needsEmailConfirmation ? "Check your email" : "Account ready"}
        >
          {vm.needsEmailConfirmation ? (
            <>
              Open the confirmation link we sent to <strong>{vm.email}</strong>, then
              come back and sign in. Your workspace is created the first time you
              sign in.
            </>
          ) : (
            <>
              You can sign in now with <strong>{vm.email}</strong>.
            </>
          )}
        </Banner>
      ) : (
        <form onSubmit={vm.submit} noValidate className="space-y-4">
          {/*
            Server refusals appear here verbatim — they name the school's domain
            or tell the student to sign in instead, which is exactly what someone
            stuck on this form needs to read.
          */}
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

          {/*
            new-password, not current-password: tells a password manager to offer
            to generate and store one rather than autofill an old one.
          */}
          <PasswordField
            id={passwordId}
            label="Choose a password"
            value={vm.password}
            onChange={vm.setPassword}
            disabled={vm.isSubmitting}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            hint="At least 8 characters."
          />

          <Button type="submit" loading={vm.isSubmitting} className="w-full">
            Create account
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
