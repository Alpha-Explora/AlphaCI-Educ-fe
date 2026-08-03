"use client";
// ============================================================================
// VIEW LAYER — STAFF sign in (/signin/staff)
//
// Teachers, IT admins and platform operators. Same endpoint, same two fields
// and the same password rules as the student door at /signin — what differs is
// everything AROUND the fields, and the difference is not decoration:
//
//   • No "create an account" link. Staff cannot self-register and never could:
//     an IT admin creates the profile (OrganizationsService.addStaff) and
//     Supabase emails an invitation. Offering registration here would send a
//     teacher to a form that refuses her by domain, which reads as "you are not
//     allowed" rather than "that is not how you get in".
//
//   • The email field says "Work email", not "School email". Staff addresses go
//     through addStaff unrestricted — STUDENT_EMAIL_DOMAINS governs students
//     only — so a teacher may legitimately sign in with an address on any
//     domain at all. Asking her for a "school email" describes a credential she
//     may not have and implies a check that does not run.
//
//   • The aside columns tell the staff story (see staffAuthAside), because the
//     student version narrates a first push from VS Code — something staff do
//     not do at all.
//
// GitHub is absent here for the same reason it is absent from the student door:
// it is an account LINK performed after signing in (/connect-github), not a way
// to log in. Staff arriving expecting a "Continue with GitHub" button sign in
// with their password first and are then sent to link it.
// ============================================================================
import Link from "next/link";
import { Banner, Spinner } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { CredentialsForm } from "@/components/auth/CredentialsForm";
import { useSignIn } from "@/viewmodels/useSignIn";
import { useAuthNotice } from "@/viewmodels/useAuthNotice";
import { useRedirectIfSignedIn } from "@/viewmodels/useRedirectIfSignedIn";
import { STUDENT_SIGN_IN_ROUTE } from "@/viewmodels/authRoutes";

export default function StaffSignInPage() {
  const { isResolving } = useRedirectIfSignedIn();
  const notice = useAuthNotice();
  // "STAFF" covers TEACHER, ADMIN and SUPER_ADMIN — the API's audience check
  // splits student from not-student, not role from role. See audienceFor().
  const vm = useSignIn("STAFF");

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
      // An eyebrow EARNS its place on this page, unlike on the student door
      // where it repeated the wordmark above it. This one answers the question
      // a teacher arrives with — "am I on the right page?" — before she reads
      // anything else, and it is the only thing on the card that distinguishes
      // the two doors at a glance.
      eyebrow="Staff"
      heading="Sign in to your classes"
      subheading="Use the email address your IT administrator invited you with."
      aside="staff"
      footer={
        <div className="space-y-2">
          {/*
            Where an account comes from, stated plainly. This is the sentence
            that was missing: a teacher whose address is not on the school
            domain had no way to tell whether she was locked out by a rule or
            simply not set up yet, and the student page's talk of school email
            addresses suggested the former. It is the latter, always.
          */}
          {/* Three sentences cut to one. The full version walked through the
              whole invitation flow — add, email, link, set password — which is
              a procedure, and a procedure belongs in the email that carries it,
              not in the footnote of a form. What a locked-out teacher needs
              here is only WHO to ask; the rest arrives when they do. */}
          <p>No account yet? Your IT administrator sets one up and emails you an invite.</p>
          <p>
            Student?{" "}
            <Link
              href={STUDENT_SIGN_IN_ROUTE}
              className="font-medium text-platform-600 underline-offset-2 hover:underline"
            >
              Sign in here instead
            </Link>
            .
          </p>
        </div>
      }
    >
      {notice && (
        <Banner tone={notice.tone} title={notice.title} className="mb-4">
          {notice.message}
        </Banner>
      )}

      <CredentialsForm
        vm={vm}
        submitLabel="Sign in"
        // Not "School email": see the note at the top of this file.
        emailLabel="Work email"
        // A neutral placeholder. The student door's `you@school.edu` would
        // reintroduce exactly the implication this page exists to remove.
        emailPlaceholder="you@example.com"
        wrongDoorLabel="Go to student sign-in"
      />
    </AuthShell>
  );
}
