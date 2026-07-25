"use client";
// ============================================================================
// VIEW LAYER — Join Code card (teacher, ADDENDUM D / Option A §3)
// The whiteboard flow: the teacher writes this code on the board and students
// enter it under "+ Join Class". Big monospace code so it reads off a
// projector, plus Copy, Regenerate (confirmed — it invalidates the old code),
// and an Active toggle. All state/mutations come from useJoinCode.
// ============================================================================
import { useState } from "react";
import { useJoinCode } from "@/viewmodels/useJoinCode";
import {
  Banner,
  Button,
  Card,
  CopyButton,
  GenericPill,
  Skeleton,
  StateBoundary,
} from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";
import { JoinCodeDisplay } from "./JoinCodeDisplay";

export function JoinCodeCard({ classId }: { classId: string }) {
  const vm = useJoinCode(classId);
  const [confirmingRegen, setConfirmingRegen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-strong)]">
            <span aria-hidden="true">🪧</span> Class join code
          </h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Write this on the whiteboard — students enter it under{" "}
            <strong className="text-[var(--text-strong)]">+ Join Class</strong>.
          </p>
        </div>
        {vm.data &&
          (vm.canJoin ? (
            <GenericPill tone="success">Joining open</GenericPill>
          ) : (
            <GenericPill tone="warning">
              {vm.isExpired ? "Code expired" : "Joining closed"}
            </GenericPill>
          ))}
      </div>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        loadingFallback={
          <div className="space-y-3 p-5">
            <Skeleton className="h-16 w-64" />
            <Skeleton className="h-8 w-40" />
          </div>
        }
      >
        {vm.data && (
          <div className="space-y-4 p-5">
            {/* The code itself — oversized monospace for projector legibility */}
            <JoinCodeDisplay code={vm.data.code} active={vm.canJoin}>
              {vm.data.joinUrl && (
                <CopyButton value={vm.data.joinUrl} label="Copy join link" />
              )}
            </JoinCodeDisplay>

            <p className="text-xs text-[var(--text-muted)]">
              {vm.data.expiresAt
                ? `Expires ${formatDateTime(vm.data.expiresAt)}`
                : "No expiry — stays valid until you regenerate or close joining."}
            </p>

            {(vm.regenerateError || vm.toggleError) && (
              <Banner
                tone={
                  (vm.regenerateError ?? vm.toggleError)?.isNetworkError
                    ? "network"
                    : "error"
                }
              >
                {(vm.regenerateError ?? vm.toggleError)?.isNetworkError
                  ? "Couldn't reach the backend."
                  : (vm.regenerateError ?? vm.toggleError)?.message}
              </Banner>
            )}

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
              {/* Active toggle */}
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-platform"
                  checked={vm.data.active}
                  disabled={vm.isToggling}
                  onChange={(e) => vm.setActive(e.target.checked)}
                />
                <span className="font-medium text-[var(--text-strong)]">
                  Allow students to join
                </span>
              </label>

              <span className="flex-1" />

              {/* Regenerate — confirmed, since it invalidates the old code */}
              {confirmingRegen ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[var(--text-strong)]">
                    Regenerate? The old code stops working immediately.
                  </span>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={vm.isRegenerating}
                    onClick={() => {
                      vm.regenerate();
                      setConfirmingRegen(false);
                    }}
                  >
                    Yes, regenerate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmingRegen(false)}
                    disabled={vm.isRegenerating}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setConfirmingRegen(true)}
                  disabled={vm.isRegenerating}
                >
                  Regenerate code…
                </Button>
              )}
            </div>
          </div>
        )}
      </StateBoundary>
    </Card>
  );
}
