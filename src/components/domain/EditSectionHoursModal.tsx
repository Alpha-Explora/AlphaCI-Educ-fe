"use client";
// ============================================================================
// VIEW LAYER — re-booking an existing section's hours.
//
// The same grid the section was created with, opened on what it currently has.
// Deliberately the SAME component: an admin who learned to book by dragging
// should not meet a different instrument to change what they booked, and two
// pickers would be two chances for one of them to disagree with the rules.
//
// The server resolves whose week to shade from the class id alone — teacher and
// rooms are facts it already holds, and asking the client to restate them would
// be a round trip and a chance to send something stale.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useAdminCreateSection } from "@/viewmodels/useAdminCreateSection";
import { useSession } from "@/viewmodels/useSession";
import type { AdminSectionRow } from "@/viewmodels/useAdminSections";
import type { ClassSchedule } from "@/models/types";
import { scheduleBlocks } from "@/models/schedule";
import { Banner, Button, Modal, cn } from "@/components/ui";
import { ScheduleGridPicker } from "./ScheduleGridPicker";
import type { PresentableError } from "@/viewmodels/errors";

export function EditSectionHoursModal({
  row,
  onClose,
  onSave,
  isSaving,
  error,
}: {
  readonly row: AdminSectionRow;
  readonly onClose: () => void;
  readonly onSave: (schedule: ClassSchedule[] | null) => void;
  readonly isSaving: boolean;
  readonly error: PresentableError | null;
}) {
  const classId = row.classInfo.id;

  // Opens on what the section currently has, so "change Tuesday to 9am" is an
  // edit rather than a re-entry of the whole slot from memory. Through
  // scheduleBlocks because a section saved before the field became a list still
  // holds a bare object, and opening THAT on an empty grid would look like the
  // hours had been lost.
  const [blocks, setBlocks] = useState<ClassSchedule[]>(() =>
    scheduleBlocks(row.classInfo.schedule),
  );

  const { labs } = useSession();

  /*
    Which rooms this section may use.

    Editable HERE, not just on creation, because moving a class to another
    laboratory mid-term is ordinary and re-creating the section to record it
    would mean a second roster and a second gradebook for one cohort. Seeded
    from what the section already meets in, falling back to the laboratory that
    owns it — a section recorded before rooms were tracked meets where it lives.
  */
  const [labIds, setLabIds] = useState<string[]>(() => {
    const meeting = row.classInfo.meetingLabOrgIds ?? [];
    return meeting.length > 0 ? meeting : [row.classInfo.orgId];
  });

  const labChoices = useMemo(
    () => labs.filter((l) => labIds.includes(l.id)).map((l) => ({ id: l.id, name: l.name })),
    [labs, labIds],
  );

  /*
    `labOrgIds` is passed EXPLICITLY alongside the class id. The server resolves
    a section's rooms from `classId` when the client says nothing, which would
    shade the rooms it meets in TODAY — so a laboratory ticked a moment ago would
    show an empty week and imply every hour in it was free.
  */
  const vm = useAdminCreateSection({ classId, labOrgIds: labIds });

  const complete = blocks.length > 0;

  useEffect(() => {
    if (!complete) return;
    const id = setTimeout(
      () => vm.check({ schedule: blocks, classId, labOrgIds: labIds }),
      250,
    );
    return () => clearTimeout(id);
    // vm identity changes each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, blocks, classId, labIds]);

  const blocked = vm.conflicts.length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Class hours — ${row.label}`}
      description="Drag once per meeting. Shaded slots are taken by this teacher or laboratory."
      size="lg"
    >
      <div className="space-y-4">
        {error && <Banner tone="error">{error.message}</Banner>}

        <fieldset>
          <legend className="text-sm font-medium text-[var(--text-strong)]">
            Laboratories
          </legend>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Every room this section uses. Each meeting is then booked in one of
            them.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {labs.map((option) => {
              const on = labIds.includes(option.id);
              // Untickable only while nothing is booked there — dropping a room
              // out from under its windows would leave them pointing at a
              // laboratory this section no longer meets in.
              const inUse = blocks.some((b) => b.labOrgId === option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={on}
                  disabled={on && inUse}
                  title={on && inUse ? "Remove its meetings first." : undefined}
                  onClick={() =>
                    setLabIds((cur) =>
                      on ? cur.filter((x) => x !== option.id) : [...cur, option.id],
                    )
                  }
                  className={cn(
                    "rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors",
                    on
                      ? "bg-platform-50 text-platform-800 ring-platform-300"
                      : "bg-white text-[var(--text-muted)] ring-[var(--border-subtle)] hover:bg-slate-50",
                    on && inUse && "cursor-not-allowed opacity-70",
                  )}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <ScheduleGridPicker
          bookings={vm.bookings}
          value={blocks}
          onChange={setBlocks}
          labs={labChoices}
        />

        {blocked && (
          <Banner tone="error" title="This slot is already taken">
            <ul className="mt-1 space-y-1">
              {vm.conflicts.map((c) => (
                <li key={`${c.kind}-${c.classId}`}>{c.message}</li>
              ))}
            </ul>
          </Banner>
        )}

        <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--border-subtle)] pt-4">
          {/* Clearing is always allowed — releasing a slot cannot collide with
              anything, and a section with no hours is a valid state. */}
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving || !row.window}
            onClick={() => onSave(null)}
          >
            Remove hours
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={isSaving}
              disabled={!complete || blocked || isSaving}
              onClick={() => onSave(blocks)}
            >
              Save hours
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
