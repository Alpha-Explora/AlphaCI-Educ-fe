"use client";
// ============================================================================
// VIEW LAYER — the class-code gate.
//
// Wraps the whole student area. A signed-in student sees this, and nothing else,
// until they type the code their teacher is displaying.
//
// WHY IT WRAPS RATHER THAN REDIRECTS
//
// A redirect to /student/enter-code would put the gate in the URL bar, and a URL
// is a thing students share, bookmark and go back past. Rendering in place means
// there is no gated route to leave: every student page is this screen until the
// code is accepted, and the moment it is, the page they were heading for appears
// underneath with no navigation at all.
//
// THIS IS NOT THE SECURITY BOUNDARY. The server refuses every student API call
// with 403 CLASS_CODE_REQUIRED regardless of what this component renders (see
// ClassAccessGuard). Editing it out in devtools yields an empty dashboard, not a
// working one. It exists so the refusal is explained rather than experienced as
// a screen of errors.
// ============================================================================
import { useState, type ReactNode } from "react";
import { useSession } from "@/viewmodels/useSession";
import { useClassCodeGate } from "@/viewmodels/useClassCodeGate";
import { Banner, Button, Input, Spinner } from "@/components/ui";

export function ClassCodeGate({ children }: { readonly children: ReactNode }) {
  const { user, isReady, logout } = useSession();

  // Staff are never gated — they hold the code. Asking a teacher for it would be
  // circular, and the server exempts them too (ClassAccessGuard), so a gate here
  // would block a screen the API is perfectly willing to serve.
  const isStudent = user?.role === "STUDENT";
  const gate = useClassCodeGate(isStudent);

  const [code, setCode] = useState("");

  /*
    Two different "not yet known" states, and both must hold the screen.

    `isReady` is the session (who are you), `gate.isReady` the admission (are you
    in). Rendering children before EITHER resolves would mount the app shell —
    nav rail, header, dashboard queries — and then tear it down again when the
    gate turns out to be up. That flash is not merely ugly: the queries it fires
    all fail with 403 and land in the cache as errors.

    Anonymous visitors fall through to `children` on purpose. They are not
    students, so there is nothing to gate; the app shell inside is what bounces
    them to sign-in, and duplicating that redirect here would be a second copy of
    a routing rule that already exists.
  */
  if (!isReady) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isStudent || gate.admitted) return <>{children}</>;

  if (!gate.isReady) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed) gate.submit(trimmed);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center py-10">
      <div className="animate-fade-up rounded-xl border border-[var(--border-subtle)] bg-white p-8 shadow-card">
        <div className="mb-6 space-y-2 text-center">
          <span aria-hidden="true" className="text-4xl">
            🔒
          </span>
          <h1 className="text-xl font-semibold text-[var(--text-strong)]">
            Enter your class code
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Your teacher shows a code at the start of every class. Type it here to
            open your dashboard.
          </p>
        </div>

        {gate.submitError && (
          <Banner tone="error" className="mb-4">
            {gate.submitError.message}
          </Banner>
        )}

        <form onSubmit={submit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              // Drop the previous failure the instant they start correcting it —
              // an error still sitting under a field they have just retyped
              // reads as a rejection of the NEW value.
              if (gate.submitError) gate.clearError();
            }}
            // Every code is upper-case; typing it in lower-case is the most
            // common way to make a correct code look wrong. The server folds
            // case anyway, so this is purely so the field matches the board.
            className="text-center font-mono text-2xl uppercase tracking-[0.3em]"
            placeholder="ABC123"
            aria-label="Class code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            // Focused on mount: this is the only control on the screen and the
            // student's next action is always to type into it.
            autoFocus
            maxLength={20}
            disabled={gate.isSubmitting}
          />

          <Button
            type="submit"
            className="w-full justify-center"
            loading={gate.isSubmitting}
            disabled={!code.trim()}
          >
            Enter class
          </Button>
        </form>

        <div className="mt-6 border-t border-[var(--border-subtle)] pt-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            No code on the board yet? Your teacher has not started the class.
          </p>
          {/* The only way off this screen. The gate renders INSTEAD of the app
              shell, so the header's logout button is not on the page — without
              this, a student signed into the wrong account would be stranded
              with no navigation at all. */}
          <button
            type="button"
            onClick={logout}
            className="mt-2 text-xs font-medium text-platform underline underline-offset-2 hover:text-platform-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
