"use client";
// ============================================================================
// VIEW LAYER — confirming the deletion of an IT admin.
//
// The counterpart to AddLabAdminModal, and a confirmation rather than a bare
// button for a specific reason: this deletes an ACCOUNT across every laboratory
// at once. The people list it is launched from is otherwise read-only, so a
// single-click delete sitting in it would be one stray click away from removing
// a colleague with no way back from this console.
//
// IT STATES THE COST BEFORE ASKING. "Are you sure?" is not a question anyone can
// answer — what an operator needs to know is what survives (the school's course
// catalogue) and what does not (the account, and its seat in every laboratory's
// GitHub organization). Both are spelled out below, because the second is the
// one people are surprised by.
// ============================================================================
import { Banner, Button, Modal } from "@/components/ui";
import type { PersonRow } from "@/viewmodels/useSuperAdminConsole";
import type { PresentableError } from "@/viewmodels/errors";

export function RemoveLabAdminModal({
  person,
  labCount,
  onCancel,
  onConfirm,
  isRemoving,
  error,
}: {
  /** The admin being removed, or null when the dialog is closed. */
  readonly person: PersonRow | null;
  /** How many laboratories they hold a seat in — the cost being released. */
  readonly labCount: number;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly isRemoving: boolean;
  readonly error: PresentableError | null;
}) {
  if (!person) return null;

  return (
    <Modal
      open
      onClose={onCancel}
      title={`Remove ${person.fullName}?`}
      description="This deletes their account. It cannot be undone from this console."
      size="md"
    >
      <div className="space-y-4">
        {error && <Banner tone="error">{error.message}</Banner>}

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--text-strong)]">
            {person.fullName}
          </p>
          <p className="font-mono text-xs text-[var(--text-muted)]">{person.email}</p>
        </div>

        <div className="space-y-2 text-sm text-[var(--text-muted)]">
          <p>
            <span className="font-medium text-[var(--text-strong)]">What goes:</span>{" "}
            their sign-in, and their membership of{" "}
            <span className="font-medium text-[var(--text-strong)]">
              {labCount === 1 ? "the laboratory" : `all ${labCount} laboratories`}
            </span>{" "}
            — including the GitHub organization seat each one costs.
          </p>
          {/*
            Said plainly because it is the reassurance that makes the decision
            possible. An operator hesitating over this button is usually
            worrying about the catalogue, not the account.
          */}
          <p>
            <span className="font-medium text-[var(--text-strong)]">What stays:</span>{" "}
            every course, section and piece of student work. The catalogue belongs
            to the school, not to the person who set it up.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isRemoving}>
            Cancel
          </Button>
          <Button type="button" variant="danger" loading={isRemoving} onClick={onConfirm}>
            Remove IT admin
          </Button>
        </div>
      </div>
    </Modal>
  );
}
