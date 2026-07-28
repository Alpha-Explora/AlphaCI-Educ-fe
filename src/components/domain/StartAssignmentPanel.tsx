"use client";
// ============================================================================
// VIEW LAYER — Start assignment in VS Code (Lab Session handoff)
// One-click launch that hands off to the AlphaCI VS Code extension via a
// vscode:// deep link (single-use claim, never a token). This sits ABOVE the
// manual LabTokenPanel: every non-launch outcome (simulated, feature off, error,
// or "VS Code didn't open") points the student at the manual steps below.
// State/actions come from useStartAssignment.
// ============================================================================
import { useStartAssignment } from "@/viewmodels/useStartAssignment";
import { useCountdown, type CountdownUrgency } from "@/viewmodels/useCountdown";
import { Banner, Button, Card, cn } from "@/components/ui";
import { brand } from "@/config/brand";

const URGENCY_STYLE: Record<CountdownUrgency, string> = {
  normal: "border-[var(--border-subtle)] bg-slate-50 text-[var(--text-strong)]",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-200 bg-red-50 text-red-700",
  expired: "border-red-200 bg-red-50 text-red-700",
};

/**
 * Time left in the lab session.
 *
 * Counts down to the SESSION WINDOW, never to the GitHub token's ~1h expiry.
 * The extension replaces that token silently every hour, so showing it would
 * put a scary clock on a non-event and — worse — teach students that their work
 * ends at an hour when it does not. This is the only deadline that stops them.
 */
function SessionCountdown({
  expiresAt,
  hours,
}: {
  readonly expiresAt: number;
  readonly hours: number | null;
}) {
  const countdown = useCountdown(expiresAt);
  if (!countdown) return null;

  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5",
        URGENCY_STYLE[countdown.urgency],
      )}
      // Announced on the minute rather than every tick: a per-second live
      // region would talk over a screen-reader user continuously.
      role="timer"
      aria-live="off"
    >
      <span className="text-sm font-medium">
        {countdown.isExpired ? "Lab session ended" : "Lab session time remaining"}
      </span>
      <span className="font-mono text-base font-semibold tabular-nums">
        {countdown.isExpired ? "—" : countdown.label}
      </span>
      <p className="w-full text-xs opacity-80">
        {countdown.isExpired
          ? "Press “Start assignment in VS Code” again to continue working. Your pushed work is safe on GitHub."
          : `Your access renews automatically until this runs out${
              hours ? ` (${hours}-hour session set by your teacher)` : ""
            }. Push your work before it does.`}
      </p>
    </div>
  );
}

export function StartAssignmentPanel({ repoId }: { repoId: string }) {
  const vm = useStartAssignment(repoId);

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

      <Button className="mt-4" onClick={vm.start} loading={vm.isStarting}>
        <span aria-hidden="true">🚀</span> Start assignment in VS Code
      </Button>

      {vm.phase === "launching" && (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Opening VS Code… If nothing happens, VS Code or the {brand.name} extension may not be
          installed — use the <strong>manual steps below</strong>.
        </p>
      )}

      {(vm.phase === "simulated" || vm.phase === "unavailable") && vm.message && (
        <Banner tone="info" className="mt-3">
          {vm.message}
        </Banner>
      )}

      {/* Shown for every started session, including simulated ones: a student
          working through the manual steps is racing the same clock. */}
      {vm.session && (
        <SessionCountdown expiresAt={vm.session.expiresAt} hours={vm.session.hours} />
      )}
    </Card>
  );
}
