"use client";
// ============================================================================
// VIEW LAYER — Appoint IT admin dialog (platform operator)
//
// The top rung of the role chain.
//
// NO LABORATORY PICKER. There used to be one, and it described a scope that did
// not exist: the API has always granted `isAdminRole` users every organization,
// so an admin "appointed to Laboratory 2" could already administer Laboratory 1
// the moment they signed in. The only thing the picker really decided was which
// single GitHub organization they were invited into — which meant the labs they
// could administer and the labs they could actually act in were different sets,
// and nothing in this dialog said so.
//
// Appointing across every laboratory removes the mismatch, and with it the
// field. A dialog should not ask a question whose answer is ignored.
//
// Presentation only — useAddLabAdmin owns validation, the mutation and the copy.
// ============================================================================
import { Banner, Button, Modal } from "@/components/ui";
import { StaffFields } from "@/components/domain/StaffFields";
import type { AddLabAdminVM } from "@/viewmodels/useAddLabAdmin";

export function AddLabAdminModal({
  open,
  onClose,
  vm,
  labCount,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly vm: AddLabAdminVM;
  /**
   * How many laboratories this appointment will cover. Shown, not chosen — an
   * operator about to grant access everywhere should be able to see how far
   * "everywhere" currently reaches before clicking.
   */
  readonly labCount: number;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Appoint an IT admin"
      description="They'll administer every laboratory, and can add each lab's teachers themselves."
      size="md"
    >
      <form onSubmit={vm.submit} noValidate className="space-y-4">
        {vm.formError && <Banner tone="error">{vm.formError}</Banner>}

        {/*
          States the scope the removed picker used to imply. It is an "info"
          rather than a warning because this is the intended, normal outcome —
          but it is stated up front because it is a broader grant than the
          dialog it replaced appeared to make, and because each laboratory
          costs a seat in that lab's GitHub organization.
        */}
        <Banner tone="info">
          {labCount === 1
            ? "They'll be added to your one laboratory, and to any you create later."
            : `They'll be added to all ${labCount} laboratories, and to any you create later.`}
        </Banner>

        <StaffFields
          values={{
            fullName: vm.fullName,
            email: vm.email,
            githubUsername: vm.githubUsername,
          }}
          errors={vm.fieldErrors}
          disabled={vm.isSubmitting}
          emailHint="They sign in with this address, and their invitation is sent here."
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
            {vm.isSubmitting ? "Appointing…" : "Appoint admin"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
