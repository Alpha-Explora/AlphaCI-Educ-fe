"use client";
// ============================================================================
// VIEW LAYER — move students between the groups of one project.
//
// A SELECT PER STUDENT, not drag-and-drop. Dragging looks like the natural fit
// for this and is the wrong choice here: it is unusable by keyboard, awkward on
// the touchscreens in a lab, and needs a drop target for "no group" that has no
// obvious place to be. A dropdown listing every group plus "Not in a group"
// says the same thing, works everywhere, and reads out loud correctly.
//
// SAVES AS ONE PIECE. The teacher edits a draft and submits the whole
// composition, because a swap cannot be expressed incrementally: move one
// student first and the group is over four, move the other first and it is
// under two. Either order is refused by rules that are correct. So nothing goes
// to the server until Save.
//
// Group COUNT is fixed here — the editor cannot add or delete a group, because
// a group is a provisioned repository. See the note on updateGroups.
// ============================================================================
import { useEditGroups } from "@/viewmodels/useEditGroups";
import type { Assignment, SystemUser } from "@/models/types";
import { Avatar, Banner, Button, Modal, Select, Spinner } from "@/components/ui";

export function EditGroupsModal({
  assignment,
  roster,
  open,
  onClose,
}: {
  readonly assignment: Assignment;
  readonly roster: readonly SystemUser[];
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const vm = useEditGroups(open ? assignment.id : null, roster);

  const options = [
    ...vm.draft.map((g) => ({ value: g.key, label: g.label })),
    { value: "", label: "Not in a group" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit groups — ${assignment.title}`}
      size="lg"
    >
      {vm.isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-[var(--text-muted)]">
            Move students between groups, then save. Groups are{" "}
            {/* Stated up front rather than only as an error, so a teacher who
                needs a different number of groups does not build the whole
                arrangement before finding out. */}
            fixed in number — each one is a real repository, so adding or
            removing a group means creating a new project.
          </p>

          {vm.error && (
            <Banner tone="warning" title="Could not load the groups">
              {vm.error.message}
            </Banner>
          )}

          {/* The consequence a teacher most needs to see BEFORE saving, not
              after. The server also returns a warning on the way out, but by
              then the change has happened. */}
          {vm.draft.some((g) => g.isGraded || g.hasSubmittedWork) && (
            <Banner tone="warning" title="Some of this work is already in progress">
              Removing a student from a group that has been submitted or marked
              leaves their commits in that repository — they lose access to it,
              and to any mark recorded against it. Neither follows them to a new
              group.
            </Banner>
          )}

          <div className="space-y-4">
            {vm.draft.map((group) => (
              <div
                key={group.key}
                className="rounded-lg border border-[var(--border-subtle)] p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    {group.label}
                  </p>
                  <p
                    className={
                      group.members.length < 2 || group.members.length > 4
                        ? "text-xs font-medium text-amber-700"
                        : "text-xs text-[var(--text-muted)]"
                    }
                  >
                    {group.members.length}{" "}
                    {group.members.length === 1 ? "member" : "members"}
                    {group.isGraded && " · marked"}
                    {!group.isGraded && group.hasSubmittedWork && " · submitted"}
                  </p>
                </div>

                {group.members.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Empty.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {group.members.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        value={group.key}
                        options={options}
                        onMove={vm.move}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {vm.unassigned.length > 0 && (
            <div className="rounded-lg border border-dashed border-[var(--border-subtle)] p-4">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                Not in a group
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Enrolled in this class with no part in this project. That is
                allowed — they simply get no repository for it.
              </p>
              <ul className="mt-3 space-y-2">
                {vm.unassigned.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    value=""
                    options={options}
                    onMove={vm.move}
                  />
                ))}
              </ul>
            </div>
          )}

          {vm.problems.length > 0 && (
            <Banner tone="warning" title="Not ready to save">
              <ul className="list-inside list-disc">
                {vm.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </Banner>
          )}

          {vm.saveError && (
            <Banner tone="warning" title="The change was not saved">
              {vm.saveError.message}
            </Banner>
          )}

          {vm.result && (
            <Banner tone="success" title="Groups updated">
              {vm.result.warnings.length > 0 ? (
                <ul className="list-inside list-disc">
                  {vm.result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                "Everyone is in the group you put them in."
              )}
            </Banner>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={vm.reset} disabled={!vm.isDirty}>
              Undo changes
            </Button>
            <Button
              onClick={vm.save}
              loading={vm.isSaving}
              // Both conditions, not just validity: saving an unchanged draft
              // would rewrite every collaborator row for nothing.
              disabled={!vm.isDirty || vm.problems.length > 0}
            >
              Save groups
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MemberRow({
  member,
  value,
  options,
  onMove,
}: {
  readonly member: SystemUser;
  readonly value: string;
  readonly options: ReadonlyArray<{ value: string; label: string }>;
  readonly onMove: (studentId: string, toGroupKey: string | null) => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2">
        <Avatar name={member.fullName} color={member.avatarColor} size="sm" />
        <span className="truncate text-sm text-[var(--text-strong)]">
          {member.fullName}
        </span>
      </span>
      <Select
        aria-label={`Group for ${member.fullName}`}
        value={value}
        onChange={(event) => onMove(member.id, event.target.value || null)}
        className="w-44"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </li>
  );
}
