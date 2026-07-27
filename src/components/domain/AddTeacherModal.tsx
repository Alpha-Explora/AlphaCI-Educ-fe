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
import { Banner, Button, Modal } from "@/components/ui";
import { StaffFields } from "@/components/domain/StaffFields";
import { ExistingTeacherPicker } from "@/components/domain/ExistingTeacherPicker";
import type { TeacherDirectoryVM } from "@/viewmodels/useTeacherDirectory";

export function AddTeacherModal({
  open,
  onClose,
  vm,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly vm: TeacherDirectoryVM;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a teacher"
      description={
        vm.pickedExisting
          ? "They already have an account — we'll add them to this laboratory and invite them to its organization."
          : "They'll get an email inviting them to set a password and join this laboratory."
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
            {vm.isSubmitting
              ? "Adding…"
              : vm.pickedExisting
                ? "Add to this laboratory"
                : "Add teacher"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
