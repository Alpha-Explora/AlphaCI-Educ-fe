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
import { Banner, Button, Card } from "@/components/ui";
import { brand } from "@/config/brand";

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
    </Card>
  );
}
