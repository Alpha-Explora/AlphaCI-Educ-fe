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
import { useEffect, useState } from "react";
import { useAdminCreateSection } from "@/viewmodels/useAdminCreateSection";
import type { AdminSectionRow } from "@/viewmodels/useAdminSections";
import type { ClassSchedule } from "@/models/types";
import { Banner, Button, Modal } from "@/components/ui";
import { ScheduleGridPicker, type GridSelection } from "./ScheduleGridPicker";
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
  readonly onSave: (schedule: ClassSchedule | null) => void;
  readonly isSaving: boolean;
  readonly error: PresentableError | null;
}) {
  const classId = row.classInfo.id;

  // Opens on what the section currently has, so "change Tuesday to 9am" is an
  // edit rather than a re-entry of the whole slot from memory.
  const [slot, setSlot] = useState<GridSelection | null>(
    row.classInfo.schedule
      ? {
          days: row.classInfo.schedule.days,
          startTime: row.classInfo.schedule.startTime,
          endTime: row.classInfo.schedule.endTime,
        }
      : null,
  );

  const vm = useAdminCreateSection({ classId });

  const complete = slot !== null && slot.days.length > 0 && slot.endTime > slot.startTime;

  useEffect(() => {
    if (!complete) return;
    const id = setTimeout(() => vm.check({ schedule: slot!, classId }), 250);
    return () => clearTimeout(id);
    // vm identity changes each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, slot, classId]);

  const blocked = vm.conflicts.length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Class hours — ${row.label}`}
      description="Drag to re-book. Shaded slots are taken by this teacher or laboratory."
      size="lg"
    >
      <div className="space-y-4">
        {error && <Banner tone="error">{error.message}</Banner>}

        <ScheduleGridPicker bookings={vm.bookings} value={slot} onChange={setSlot} />

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
              onClick={() => onSave(slot)}
            >
              Save hours
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
