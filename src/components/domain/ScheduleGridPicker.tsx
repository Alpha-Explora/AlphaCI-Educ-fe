"use client";
// ============================================================================
// VIEW LAYER — booking a slot by clicking the week.
//
// Replaced a day-checkbox row and two <input type="time"> fields. Those could
// express the schedule but never showed the ONE thing that decides it: what is
// already taken. The admin typed a time, was told it clashed, typed another, and
// hunted for a gap by trial and error. Here the gaps are the empty cells.
//
// HOW A CLASS SCHEDULE MAPS ONTO A GRID
//
// ClassSchedule is `{ days[], startTime, endTime }` — ONE window applied to
// several days, not a different time per day. So the grid is not free-form: a
// selection is a time RANGE plus a set of DAYS, and dragging in a second column
// moves the shared window rather than giving that day its own. Drag once to set
// the hours; click day headers to add days at those same hours.
//
// BUSY CELLS ARE NOT CLICKABLE. Greying alone would let an admin drag across a
// booked slot and only learn at Save; the pointer refuses instead, and a drag
// that would cross a busy cell stops at its edge.
// ============================================================================
import { useMemo, useRef, useState } from "react";
import { DAY_SHORT, formatTime12 } from "@/models/schedule";
import type { ScheduleBooking } from "@/models/types";
import { cn } from "@/components/ui";

/**
 * The bookable day, in 30-minute steps.
 *
 * 6am–10pm covers a school day; 30 minutes is the coarsest step that still
 * expresses the timetables this product already has (13:00–15:40 exists, so
 * hour-only steps would have been unable to represent real data).
 */
const START_HOUR = 6;
const END_HOUR = 22;
const STEP_MIN = 30;
const SLOTS_PER_HOUR = 60 / STEP_MIN;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
const DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Slot index -> "HH:MM". Index 0 is START_HOUR:00. */
function slotToTime(slot: number): string {
  const mins = START_HOUR * 60 + slot * STEP_MIN;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function timeToSlot(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60 + m - START_HOUR * 60) / STEP_MIN;
}

export interface GridSelection {
  days: number[];
  startTime: string;
  endTime: string;
}

export function ScheduleGridPicker({
  bookings,
  value,
  onChange,
}: {
  readonly bookings: ScheduleBooking[];
  readonly value: GridSelection | null;
  readonly onChange: (next: GridSelection | null) => void;
}) {
  // Anchor slot of a drag in progress, or null. Held in state (not a ref) so the
  // preview repaints as the pointer moves.
  const [anchor, setAnchor] = useState<{ day: number; slot: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);

  /*
    Which (day, slot) pairs are already taken, and by what. Built once per
    bookings change rather than asked per cell — 7 x 32 cells would otherwise
    re-scan every booking 224 times a paint.
  */
  const busy = useMemo(() => {
    const map = new Map<string, ScheduleBooking>();
    for (const b of bookings) {
      const from = Math.max(0, timeToSlot(b.schedule.startTime));
      const to = Math.min(TOTAL_SLOTS, timeToSlot(b.schedule.endTime));
      for (const day of b.schedule.days) {
        for (let slot = from; slot < to; slot += 1) map.set(`${day}:${slot}`, b);
      }
    }
    return map;
  }, [bookings]);

  const isBusy = (day: number, slot: number) => busy.get(`${day}:${slot}`);

  const selectedDays = value?.days ?? [];
  const selStart = value ? timeToSlot(value.startTime) : null;
  const selEnd = value ? timeToSlot(value.endTime) : null;

  /** The range a drag currently describes, clamped before any booked slot. */
  const previewRange = (() => {
    if (!anchor || hover === null) return null;
    const lo = Math.min(anchor.slot, hover);
    const hi = Math.max(anchor.slot, hover);
    // Stop at the first busy slot rather than jumping over it — a selection that
    // silently skipped a booked hour would be a selection the server refuses.
    let end = hi;
    for (let s = lo; s <= hi; s += 1) {
      if (isBusy(anchor.day, s)) {
        end = s - 1;
        break;
      }
    }
    return end < lo ? null : { day: anchor.day, from: lo, to: end };
  })();

  const commit = (day: number, from: number, to: number) => {
    const start = slotToTime(from);
    const end = slotToTime(to + 1); // end-exclusive: a slot's end is the next one
    // Keep any days already chosen, and make sure the dragged one is included.
    const days = [...new Set([...(value?.days ?? []), day])].sort((a, b) => a - b);
    onChange({ days, startTime: start, endTime: end });
  };

  const toggleDay = (day: number) => {
    if (!value) return; // Nothing to apply the day to yet.
    const on = value.days.includes(day);
    // Refuse a day whose slots are taken at these hours — the grid must not let
    // you select something Save will reject.
    if (!on && selStart !== null && selEnd !== null) {
      for (let s = selStart; s < selEnd; s += 1) if (isBusy(day, s)) return;
    }
    const days = on ? value.days.filter((d) => d !== day) : [...value.days, day];
    onChange(days.length === 0 ? null : { ...value, days: days.sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">
          Drag down a column to set the hours, then click other day names to add
          them. Shaded slots are already taken.
        </p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-platform underline underline-offset-2 hover:text-platform-700"
          >
            Clear
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <div className="min-w-[560px] select-none">
          {/* Day headers double as the day toggles. */}
          <div className="flex border-b border-[var(--border-subtle)] bg-slate-50/70">
            <div className="w-14 shrink-0" />
            {DAYS.map((d) => {
              const on = selectedDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  disabled={!value}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "bg-platform-600 text-white"
                      : "text-[var(--text-muted)] hover:bg-slate-100",
                    !value && "cursor-not-allowed opacity-60",
                  )}
                >
                  {DAY_SHORT[d]}
                </button>
              );
            })}
          </div>

          <div
            className="flex"
            onPointerUp={() => {
              if (previewRange) commit(previewRange.day, previewRange.from, previewRange.to);
              dragging.current = false;
              setAnchor(null);
              setHover(null);
            }}
            onPointerLeave={() => {
              dragging.current = false;
              setAnchor(null);
              setHover(null);
            }}
          >
            <div className="w-14 shrink-0">
              {Array.from({ length: TOTAL_SLOTS }, (_, slot) => (
                <div
                  key={slot}
                  className={cn(
                    "h-5 pr-1 text-right text-[10px] leading-5 text-[var(--text-muted)]",
                    slot % SLOTS_PER_HOUR !== 0 && "invisible",
                  )}
                >
                  {formatTime12(slotToTime(slot))}
                </div>
              ))}
            </div>

            {DAYS.map((day) => (
              <div key={day} className="flex-1 border-l border-[var(--border-subtle)]">
                {Array.from({ length: TOTAL_SLOTS }, (_, slot) => {
                  const taken = isBusy(day, slot);
                  const inPreview =
                    previewRange?.day === day &&
                    slot >= previewRange.from &&
                    slot <= previewRange.to;
                  const inSelection =
                    !previewRange &&
                    selectedDays.includes(day) &&
                    selStart !== null &&
                    selEnd !== null &&
                    slot >= selStart &&
                    slot < selEnd;

                  return (
                    <div
                      key={slot}
                      role="button"
                      tabIndex={-1}
                      aria-disabled={Boolean(taken)}
                      title={
                        taken
                          ? `${taken.classLabel} — ${taken.reasons.includes("TEACHER") ? "this teacher" : "this laboratory"} is busy`
                          : `${DAY_SHORT[day]} ${formatTime12(slotToTime(slot))}`
                      }
                      onPointerDown={() => {
                        if (taken) return;
                        dragging.current = true;
                        setAnchor({ day, slot });
                        setHover(slot);
                      }}
                      onPointerEnter={() => {
                        if (dragging.current && anchor?.day === day) setHover(slot);
                      }}
                      className={cn(
                        "h-5 border-b transition-colors",
                        slot % SLOTS_PER_HOUR === 0
                          ? "border-[var(--border-subtle)]"
                          : "border-transparent",
                        taken &&
                          "cursor-not-allowed bg-slate-200/80 [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(100,116,139,0.25)_3px,rgba(100,116,139,0.25)_6px)]",
                        !taken && "cursor-pointer hover:bg-platform-50",
                        (inPreview || inSelection) && "bg-platform-500 hover:bg-platform-500",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        {value ? (
          <>
            <span className="font-medium text-[var(--text-strong)]">
              {value.days.map((d) => DAY_SHORT[d]).join(", ")} ·{" "}
              {formatTime12(value.startTime)}–{formatTime12(value.endTime)}
            </span>{" "}
            (Philippine time)
          </>
        ) : (
          "No hours selected — the section will be created without a timetable."
        )}
      </p>
    </div>
  );
}
