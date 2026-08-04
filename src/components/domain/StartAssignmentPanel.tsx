"use client";
// ============================================================================
// VIEW LAYER — Start assignment in VS Code (Lab Session handoff)
//
// One-click launch that hands off to the AlphaCI VS Code extension via a
// vscode:// deep link (single-use claim, never a token).
//
// THIS IS THE ONLY ROUTE TO THE CODE. The manual "Lab access token" panel that
// used to sit below it is gone: it printed a live `ghs_` credential on a shared
// lab screen, put it on the clipboard, and asked a fourteen-year-old to paste it
// into a shell — for a job the extension does invisibly. Removing it changes what
// this panel owes the student: every failure state has to name who can fix it,
// because there is no longer a second path to point at.
//
// THERE IS NO COUNTDOWN, AND THAT IS THE POINT. A session used to run against a
// fixed window (LAB_MAX_SESSION_HOURS) with a clock ticking down in this card.
// Access now continues for as long as the project is open and the class is inside
// its teacher-set meeting hours, so what this shows instead is the TIMETABLE — a
// fact a student can plan around, rather than a number falling toward a deadline
// that was never the real one.
//
// State/actions come from useStartAssignment.
// ============================================================================
import { useStartAssignment } from "@/viewmodels/useStartAssignment";
import { Banner, Button, Card, Skeleton } from "@/components/ui";
import { brand } from "@/config/brand";

export function StartAssignmentPanel({ repoId }: { readonly repoId: string }) {
  const vm = useStartAssignment(repoId);

  // "Reopen" once VS Code has already collected a launch. The distinction is the
  // student's, not the server's: pressing Start with an editor already open reads
  // as "nothing happened" unless the button admits it is a second opening.
  const isReopen = vm.launched;
  const canStart = vm.handoffEnabled && vm.openNow;

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-[var(--text-strong)]">
        Start in VS Code
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        One click opens this repository in VS Code on the lab PC with{" "}
        <code className="font-mono text-xs">git push</code> already working — no personal
        account needed.
      </p>

      {/* The operator has not switched the handoff on. Shown BEFORE the button so
          a student is not invited to press something that can only 503. */}
      {!vm.handoffEnabled && (
        <Banner tone="warning" className="mt-4" title="Not switched on yet">
          One-click launch has not been enabled for this server. Tell your teacher — it
          needs turning on before anyone can open an assignment.
        </Banner>
      )}

      {/* Outside class hours, or the teacher closed the project. The server writes
          this sentence and it already names the class, its hours and when they
          resume — so it is rendered verbatim rather than paraphrased into
          something vaguer. */}
      {vm.handoffEnabled && !vm.openNow && vm.closedReason && (
        <Banner tone="info" className="mt-4" title="Not open right now">
          {vm.closedReason}
        </Banner>
      )}

      {vm.isLoadingStatus ? (
        // A button whose label depends on server state must not render before that
        // state arrives: "Start" flipping to "Reopen" a moment later is how a
        // student ends up pressing both.
        <Skeleton className="mt-4 h-11 w-64 rounded-lg" />
      ) : (
        <Button
          className="mt-4"
          onClick={vm.start}
          loading={vm.isStarting}
          disabled={!canStart}
        >
          <span aria-hidden="true">🚀</span>{" "}
          {isReopen ? "Reopen in VS Code" : "Start assignment in VS Code"}
        </Button>
      )}

      {/* The permission prompt is named FIRST because it is the common case and
          the old copy misdiagnosed it. VS Code asks "Allow … to open this URI?"
          whenever a browser hands it a vscode:// link, and until that is
          answered nothing happens at all — which read as "the extension is
          broken" and sent people to reinstall software that was working. */}
      {vm.phase === "launching" && (
        <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
          <p>
            Opening VS Code… If VS Code asks{" "}
            <strong>&ldquo;Allow {brand.name} to open this URI?&rdquo;</strong>, choose{" "}
            <strong>Open</strong> — tick &ldquo;Do not ask me again&rdquo; and it will not
            ask on this PC again.
          </p>
          {/* Re-following the SAME link, with no server call. The claim is
              single-use, so this is either harmless or the thing that finally
              works — and it gives an impatient student something to press that
              cannot mint a second credential. */}
          {vm.retryOpen && (
            <p>
              Nothing appeared?{" "}
              <button
                type="button"
                onClick={vm.retryOpen}
                className="font-medium text-platform underline hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
              >
                Try the same link again
              </button>{" "}
              — this reuses the launch you already started. If it still does nothing,
              VS Code or the {brand.name} extension is not installed on this PC: tell
              your teacher.
            </p>
          )}
        </div>
      )}

      {/* Not a failure: the server refused to build a SECOND session while the
          first is still opening. Info tone, because the student did nothing
          wrong and nothing is broken. */}
      {vm.phase === "throttled" && vm.message && (
        <Banner tone="info" className="mt-3">
          {vm.message}
        </Banner>
      )}

      {vm.phase === "simulated" && vm.message && (
        <Banner tone="warning" className="mt-3" title="This lab isn't connected yet">
          {vm.message}
        </Banner>
      )}

      {vm.phase === "unavailable" && vm.message && (
        <Banner tone="error" className="mt-3">
          {vm.message}
        </Banner>
      )}

      {/* WHAT REPLACED THE COUNTDOWN.
          Two sentences, both static: how long access lasts, and what governs it.
          The second only appears when the teacher actually set meeting hours —
          most classes have none, and inventing a rule for them would be worse
          than saying nothing. */}
      {canStart && (
        <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-slate-50 px-3 py-2.5 text-xs text-[var(--text-muted)]">
          <p>
            Your access renews itself while you work — there is no time limit to watch,
            and nothing to press again. Push whenever you are ready.
          </p>
          {vm.scheduleLabel && (
            <p className="mt-1.5">
              This project is open during class hours:{" "}
              <span className="font-medium text-[var(--text-strong)]">
                {vm.scheduleLabel}
              </span>
              . Pushing stops outside them.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
