"use client";
// ============================================================================
// VIEW LAYER — Add teacher dialog (admin)
//
// Name, email, and optionally the GitHub username. The platform still puts the
// teacher into its GitHub organization and Teacher team server-side; the handle
// is offered because supplying it is what lets the system prove the account
// that eventually connects is the person who was invited.
//
// Presentation only — the VM (useTeacherDirectory) owns validation, the
// mutation, and the wording of the result.
// ============================================================================
import { Banner, Button, Modal, cn } from "@/components/ui";
import { StaffFields } from "@/components/domain/StaffFields";
import { ExistingTeacherPicker } from "@/components/domain/ExistingTeacherPicker";
import type { TeacherDirectoryVM } from "@/viewmodels/useTeacherDirectory";

/**
 * Which laboratories this teacher should be able to work in.
 *
 * Checkboxes rather than a single picker because an IT Admin administers every
 * laboratory, and a teacher shared between two schools is a normal case here —
 * the backend attaches one account to each lab rather than making a second one.
 */
function LabChecklist({ vm }: { readonly vm: TeacherDirectoryVM }) {
  if (vm.labOptions.length === 0) return null;

  // Labs the picked teacher already teaches at. The API gives names, not ids,
  // so this matches on name — it's a hint, never a gate.
  const alreadyIn = new Set(
    (vm.pickedExisting?.labNames ?? []).map((n) => n.toLowerCase()),
  );

  return (
    <fieldset className="space-y-2" disabled={vm.isSubmitting}>
      <legend className="text-sm font-medium text-[var(--text-strong)]">
        Laboratories
      </legend>
      <p className="text-xs text-[var(--text-muted)]">
        Tick every laboratory they should be able to teach in. They get one account
        across all of them, not one per laboratory.
      </p>

      <div
        className={cn(
          "max-h-44 space-y-0.5 overflow-y-auto rounded-lg border p-1.5",
          vm.labsError ? "border-danger" : "border-[var(--border-subtle)]",
        )}
      >
        {vm.labOptions.map((lab) => {
          const checked = vm.selectedLabIds.includes(lab.id);
          return (
            <label
              key={lab.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => vm.toggleLab(lab.id)}
                className="h-4 w-4 shrink-0 accent-platform"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-strong)]">
                {lab.name}
              </span>
              {alreadyIn.has(lab.name.toLowerCase()) && (
                <span className="shrink-0 text-xs text-[var(--text-muted)]">
                  already teaches here
                </span>
              )}
            </label>
          );
        })}
      </div>

      {vm.labsError && <p className="text-xs font-medium text-danger">{vm.labsError}</p>}
    </fieldset>
  );
}

export function AddTeacherModal({
  open,
  onClose,
  vm,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly vm: TeacherDirectoryVM;
}) {
  const labCount = vm.selectedLabIds.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a teacher"
      description={
        vm.pickedExisting
          ? "They already have an account — we'll add them to the laboratories you tick and invite them to each organization."
          : "They'll get one email inviting them to set a password, and access to every laboratory you tick."
      }
      size="md"
    >
      <form onSubmit={vm.submit} noValidate className="space-y-4">
        {vm.formError && <Banner tone="error">{vm.formError}</Banner>}

        {/* Offered FIRST: reusing an existing teacher is both less typing and
            the only way to get their email and handle exactly right. */}
        <ExistingTeacherPicker
          teachers={vm.transferable}
          matches={vm.transferableMatches}
          query={vm.transferableQuery}
          onQueryChange={vm.setTransferableQuery}
          isLoading={vm.isLoadingTransferable}
          picked={vm.pickedExisting}
          onPick={vm.pickExisting}
          onClear={vm.clearPicked}
          disabled={vm.isSubmitting}
        />

        <StaffFields
          values={{
            fullName: vm.fullName,
            email: vm.email,
            githubUsername: vm.githubUsername,
          }}
          errors={vm.fieldErrors}
          disabled={vm.isSubmitting}
          emailHint="Their invitation is sent here, so double-check it before adding."
          onChange={(field, value) => {
            if (field === "fullName") vm.setFullName(value);
            else if (field === "email") vm.setEmail(value);
            else vm.setGithubUsername(value);
          }}
        />

        <LabChecklist vm={vm} />

        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={vm.isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" loading={vm.isSubmitting}>
            {(() => {
              if (vm.isSubmitting) return "Adding…";
              // Naming the count is the confirmation that the ticks took effect
              // — this button is the last thing read before a multi-lab add.
              if (labCount > 1) return `Add to ${labCount} laboratories`;
              return vm.pickedExisting ? "Add to this laboratory" : "Add teacher";
            })()}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
