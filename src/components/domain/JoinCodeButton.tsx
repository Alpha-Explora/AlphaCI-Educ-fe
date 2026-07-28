"use client";
// ============================================================================
// VIEW LAYER — Join Code button + dialog (teacher, ADDENDUM D / Option A §3)
//
// The whiteboard flow: the teacher writes this code on the board and students
// enter it under "+ Join Class". Was a permanently-expanded card on the class
// page; it is now a button that opens the same controls in a dialog, because
// the code is needed for about a minute at the start of a session and spent the
// rest of the term pushing the roster below the fold.
//
// The button still carries the join STATUS, though — "is joining still open?"
// is the one thing a teacher checks without wanting to act, and burying it
// behind a click would trade a layout win for a worse answer to the common
// question.
//
// One useJoinCode instance serves both the button and the dialog. All
// state/mutations live there; this is presentation only.
// ============================================================================
import { useState } from "react";
import { useJoinCode } from "@/viewmodels/useJoinCode";
import {
  Banner,
  Button,
  CopyButton,
  GenericPill,
  Modal,
  Skeleton,
  StateBoundary,
} from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";
import { JoinCodeDisplay } from "./JoinCodeDisplay";

export function JoinCodeButton({ classId }: { classId: string }) {
  const vm = useJoinCode(classId);
  const [open, setOpen] = useState(false);
  const [confirmingRegen, setConfirmingRegen] = useState(false);

  /** Closing discards a half-confirmed regenerate, so reopening starts clean. */
  function close() {
    setOpen(false);
    setConfirmingRegen(false);
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        // The code itself is the label's payload, so the button announces it
        // rather than just "Class join code".
        aria-label={
          vm.data ? `Class join code ${vm.data.code}` : "Class join code"
        }
      >
        <span aria-hidden="true">🪧</span>
        Class join code
        {vm.data && (
          <>
            <span className="font-mono text-xs tracking-wider text-[var(--text-muted)]">
              {vm.data.code}
            </span>
            {vm.canJoin ? (
              <GenericPill tone="success">Joining open</GenericPill>
            ) : (
              <GenericPill tone="warning">
                {vm.isExpired ? "Code expired" : "Joining closed"}
              </GenericPill>
            )}
          </>
        )}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Class join code"
        description="Write this on the whiteboard — students enter it under + Join Class."
        size="md"
      >
        <StateBoundary
          isLoading={vm.isLoading}
          error={vm.error}
          onRetry={vm.refetch}
          loadingFallback={
            <div className="space-y-3">
              <Skeleton className="h-16 w-64" />
              <Skeleton className="h-8 w-40" />
            </div>
          }
        >
          {vm.data && (
            <div className="space-y-4">
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
      </Modal>
    </>
  );
}
