"use client";
// ============================================================================
// VIEW LAYER — Join Code strip + dialog (teacher, ADDENDUM D / Option A §3)
//
// The whiteboard flow: the teacher writes this code on the board and students
// enter it under "+ Join Class".
//
// Three components, one behaviour:
//   JoinCodeDialog — the controls (regenerate, open/close joining). Everything
//                    that CHANGES the code lives behind a click, because those
//                    actions are rare and one of them invalidates a code a room
//                    full of students may already be typing.
//   JoinCodeStrip  — the code itself, READ-ONLY and on the page. Reading it is
//                    the common act by a wide margin, and a code you must open
//                    a dialog to see is a code you read out wrong.
//   JoinCodeButton — the older collapsed form, for surfaces with no room for
//                    the strip.
//
// Sized to be read, not projected: JoinCodeDisplay's 4xl/5xl belongs in the
// dialog and on the create-class confirmation, where the code IS the content.
// On a page that also carries a roster it is a chip.
//
// Every instance shares one useJoinCode (same query key, one request). All
// state/mutations live there; these are presentation only.
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
  cn,
} from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";
import { JoinCodeDisplay } from "./JoinCodeDisplay";

/** "Joining open" / "Joining closed" / "Code expired", from one vm. */
function JoinStatusPill({
  canJoin,
  isExpired,
}: Readonly<{ canJoin: boolean; isExpired: boolean }>) {
  if (canJoin) return <GenericPill tone="success">Joining open</GenericPill>;
  return (
    <GenericPill tone="warning">
      {isExpired ? "Code expired" : "Joining closed"}
    </GenericPill>
  );
}

function JoinCodeDialog({
  classId,
  open,
  onClose,
}: Readonly<{ classId: string; open: boolean; onClose: () => void }>) {
  const vm = useJoinCode(classId);
  const [confirmingRegen, setConfirmingRegen] = useState(false);

  /** Closing discards a half-confirmed regenerate, so reopening starts clean. */
  function close() {
    setConfirmingRegen(false);
    onClose();
  }

  return (
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
  );
}

/**
 * The code, on the page, at reading size.
 *
 * Deliberately shows the code before any interaction: the teacher reads it out
 * or writes it on the board at the start of a session, and the status beside it
 * answers "why can't they join?" without a click. Everything that MUTATES the
 * code stays in the dialog behind "Manage".
 */
export function JoinCodeStrip({ classId }: Readonly<{ classId: string }>) {
  const vm = useJoinCode(classId);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-platform-200 bg-platform-50 px-4 py-3 animate-fade-up">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-lg">
            🪧
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Class join code
            </p>
            {vm.isLoading ? (
              <Skeleton className="mt-1 h-6 w-32" />
            ) : (
              <output
                aria-label="Class join code"
                className={cn(
                  "font-mono text-xl font-bold tracking-[0.12em]",
                  vm.canJoin ? "text-platform-800" : "text-[var(--text-muted)] line-through",
                )}
              >
                {vm.data?.code ?? "—"}
              </output>
            )}
          </div>
        </div>

        {vm.data && (
          <>
            <JoinStatusPill canJoin={vm.canJoin} isExpired={vm.isExpired} />
            <span className="hidden flex-1 sm:block" />
            <div className="flex items-center gap-2">
              <CopyButton value={vm.data.code} label="Copy code" />
              <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
                Manage…
              </Button>
            </div>
          </>
        )}
      </div>

      <JoinCodeDialog classId={classId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** The collapsed form: status on the face, everything else behind a click. */
export function JoinCodeButton({ classId }: Readonly<{ classId: string }>) {
  const vm = useJoinCode(classId);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        // The code itself is the label's payload, so the button announces it
        // rather than just "Class join code".
        aria-label={vm.data ? `Class join code ${vm.data.code}` : "Class join code"}
      >
        <span aria-hidden="true">🪧</span>
        Class join code
        {vm.data && (
          <>
            <span className="font-mono text-xs tracking-wider text-[var(--text-muted)]">
              {vm.data.code}
            </span>
            <JoinStatusPill canJoin={vm.canJoin} isExpired={vm.isExpired} />
          </>
        )}
      </Button>

      <JoinCodeDialog classId={classId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
