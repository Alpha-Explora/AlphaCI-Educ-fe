"use client";
// ============================================================================
// VIEW LAYER — Appoint IT admin dialog (platform operator)
//
// The top rung of the role chain. Unlike the teacher dialog this one also picks
// WHICH laboratory, because the operator works across every customer rather than
// inside one.
//
// Presentation only — useAddLabAdmin owns validation, the mutation and the copy.
// ============================================================================
import { Banner, Button, Modal, Select } from "@/components/ui";
import { StaffFields } from "@/components/domain/StaffFields";
import type { AddLabAdminVM } from "@/viewmodels/useAddLabAdmin";

export function AddLabAdminModal({
  open,
  onClose,
  vm,
  labs,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly vm: AddLabAdminVM;
  readonly labs: { orgId: string; orgName: string }[];
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Appoint an IT admin"
      description="They'll administer one laboratory, and can then add that lab's teachers themselves."
      size="md"
    >
      <form onSubmit={vm.submit} noValidate className="space-y-4">
        {vm.formError && <Banner tone="error">{vm.formError}</Banner>}

        <div className="space-y-1.5">
          <label
            htmlFor="add-admin-lab"
            className="block text-sm font-medium text-[var(--text-strong)]"
          >
            Laboratory
          </label>
          <Select
            id="add-admin-lab"
            value={vm.orgId ?? ""}
            onChange={(e) => vm.setOrgId(e.target.value || null)}
            disabled={vm.isSubmitting}
          >
            <option value="">Choose a laboratory…</option>
            {labs.map((lab) => (
              <option key={lab.orgId} value={lab.orgId}>
                {lab.orgName}
              </option>
            ))}
          </Select>
        </div>

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
