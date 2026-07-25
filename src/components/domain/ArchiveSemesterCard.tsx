"use client";
// ============================================================================
// VIEW LAYER — Archive semester action (Data Archival Engine)
// Two-step confirm to avoid accidental archival. Flips active repos to
// ARCHIVED (read-only) via the admin VM. Shows the count archived.
// ============================================================================
import { useState } from "react";
import type { PresentableError } from "@/viewmodels/errors";
import { Banner, Button, Card } from "@/components/ui";

export function ArchiveSemesterCard({
  activeRepositories,
  onArchive,
  isArchiving,
  error,
  lastArchivedCount,
}: {
  activeRepositories: number;
  onArchive: () => void;
  isArchiving: boolean;
  error: PresentableError | null;
  lastArchivedCount: number | null;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">
          🗄️
        </span>
        <h2 className="text-base font-semibold text-[var(--text-strong)]">
          Archive semester
        </h2>
      </div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Freezes active repositories to read-only and flags their database rows as{" "}
        <code className="font-mono text-xs">ARCHIVED</code> — satisfying FERPA retention while
        keeping active queries fast. Currently{" "}
        <strong className="text-[var(--text-strong)]">{activeRepositories}</strong> active
        repositories.
      </p>

      {error && (
        <Banner tone={error.isNetworkError ? "network" : "error"} className="mt-4">
          {error.isNetworkError
            ? "Couldn't reach the backend to archive."
            : error.message}
        </Banner>
      )}

      {lastArchivedCount !== null && !error && (
        <Banner tone="success" className="mt-4">
          Archived {lastArchivedCount} repositor{lastArchivedCount === 1 ? "y" : "ies"}.
        </Banner>
      )}

      <div className="mt-4">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[var(--text-strong)]">
              Archive {activeRepositories} repositories?
            </span>
            <Button
              variant="danger"
              size="sm"
              loading={isArchiving}
              onClick={() => {
                onArchive();
                setConfirming(false);
              }}
            >
              Yes, archive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setConfirming(true)}
            disabled={activeRepositories === 0 || isArchiving}
          >
            Archive semester…
          </Button>
        )}
      </div>
    </Card>
  );
}
