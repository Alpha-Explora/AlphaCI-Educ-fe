"use client";
// ============================================================================
// VIEW LAYER — "Laboratories used" button + dialog (teacher)
//
// Which laboratories a section meets in, editable in place. Rooms get
// reassigned mid-term, and the alternative — re-creating the section in the new
// lab — would give one cohort two rosters and two gradebooks.
//
// Was an always-open card. It is now a button, because this is a
// once-a-semester edit that was occupying prime vertical space above the
// roster. The button shows the current count so the common case (just checking)
// needs no click.
//
// Presentation only — useClassMeetingLabs owns the option list and the save.
// ============================================================================
import { useState } from "react";
import type { ClassMeetingLabsVM } from "@/viewmodels/useClassMeetingLabs";
import { Banner, Button, Modal } from "@/components/ui";

export function MeetingLabsButton({
  vm,
  /** Currently selected lab org ids, from the loaded class. */
  selected,
  /** The lab that owns the course — its repositories never move. */
  owningOrgId,
}: {
  vm: ClassMeetingLabsVM;
  selected: readonly string[];
  owningOrgId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <span aria-hidden="true">📍</span>
        Laboratories used
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--text-muted)]">
          {selected.length}
        </span>
      </Button>

      <Modal
        open={open}
        // Saves apply immediately per checkbox, so there is no Cancel here —
        // closing mid-save would only hide the outcome, not undo it.
        onClose={() => setOpen(false)}
        title="Laboratories used"
        description="Where this section meets. Changing it only changes where the class appears — its repositories stay in the laboratory that owns the course."
        size="md"
      >
        <div className="space-y-3">
          {vm.error && <Banner tone="error">{vm.error}</Banner>}

          <div className="space-y-0.5">
            {vm.options.map((lab) => {
              const checked = selected.includes(lab.id);
              return (
                <label
                  key={lab.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={vm.isSaving}
                    onChange={() =>
                      vm.save(
                        checked
                          ? selected.filter((id) => id !== lab.id)
                          : [...selected, lab.id],
                      )
                    }
                    className="h-4 w-4 shrink-0 accent-platform"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-strong)]">
                    {lab.name}
                  </span>
                  {lab.id === owningOrgId && (
                    <span className="shrink-0 text-xs text-platform">
                      stores this class&apos;s work
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
            <span className="text-xs text-[var(--text-muted)]" role="status">
              {vm.isSaving ? "Saving…" : "Changes save as you tick."}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
