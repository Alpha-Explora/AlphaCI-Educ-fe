"use client";
// ============================================================================
// VIEW LAYER — "Provision student repositories" (teacher action, ADDENDUM B)
// Presentational: all state/mutation/invalidation lives in
// useProvisionRepositories. After provisioning shows a SIMULATED/LIVE badge, the
// created count, and — when live (real GitHub) — links to each created repo and
// its Actions/CI, plus the CI/CD scaffold stack + file count.
// ============================================================================
import { useProvisionRepositories } from "@/viewmodels/useProvisionRepositories";
import { Banner, Button, GithubMark } from "@/components/ui";
import { ProvisionResultSummary } from "./ProvisionResultSummary";

export function ProvisionRepositoriesButton({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const vm = useProvisionRepositories(assignmentId);
  const summary = vm.summary;

  return (
    <div className="flex w-full flex-col items-end gap-2 sm:w-auto">
      <Button
        variant="github"
        size="sm"
        onClick={vm.provision}
        loading={vm.isProvisioning}
      >
        <GithubMark size={15} /> Provision student repositories
      </Button>

      {vm.error && (
        <Banner
          tone={vm.error.isNetworkError ? "network" : "error"}
          className="w-full"
        >
          {vm.error.isNetworkError
            ? "Couldn't reach the backend to provision."
            : vm.error.message}
        </Banner>
      )}

      {summary && (
        <div className="w-full sm:w-80">
          <ProvisionResultSummary summary={summary} />
        </div>
      )}
    </div>
  );
}
