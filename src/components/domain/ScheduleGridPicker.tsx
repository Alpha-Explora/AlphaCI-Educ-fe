"use client";
// ============================================================================
// VIEW LAYER — booking a slot by clicking the week.
//
// Replaced a day-checkbox row and two <input type="time"> fields. Those could
// express the schedule but never showed the ONE thing that decides it: what is
// already taken. The admin typed a time, was told it clashed, typed another, and
// hunted for a gap by trial and error. Here the gaps are the empty cells.
//
// EVERY DRAG IS ITS OWN WINDOW
//
// This grid used to hold a single `{ days[], startTime, endTime }`, which meant
// one time range applied to every selected day. Dragging Monday 8–10 and then
// Wednesday 1–3 did not produce two windows — the second drag MOVED the shared
// range, and Monday silently became 1–3 as well. A real timetable is per-day, so
// the value is a LIST of windows and each drag adds one.
//
// It still collapses back to the compact shape wherever it can: three days
// dragged to the same hours are stored as ONE window with three days, not three.
// That is `toBlocks` in models/schedule-grid.ts — which also owns the slot
// arithmetic and the run merging, because those have edge cases at every
// boundary and none of them need React to be exercised.
//
// BUSY CELLS ARE NOT CLICKABLE. Greying alone would let an admin drag across a
// booked slot and only learn at Save; the pointer refuses instead, and a drag
// that would cross a busy cell stops at its edge.
// ============================================================================
import { memo, useMemo, useRef, useState } from "react";
import { DAY_SHORT, formatTime12 } from "@/models/schedule";
import {
  GRID_SLOTS_PER_HOUR as SLOTS_PER_HOUR,
  GRID_TOTAL_SLOTS as TOTAL_SLOTS,
  mergeRuns,
  slotToTime,
  timeToSlot,
  toBlocks,
  toRuns,
  type Run,
} from "@/models/schedule-grid";
import type { ClassSchedule, ScheduleBooking } from "@/models/types";
import { cn } from "@/components/ui";

/*
  ROW HEIGHT IS THE WHOLE DIALOG'S HEIGHT. Thirty-two half-hour rows at 20px is
  640px of grid, which pushed the modal past a laptop viewport and made the very
  fields that decide what the grid shades scroll away. At 14px the same sixteen
  hours are 448px and the dialog fits without scrolling, while a 30-minute slot
  is still a comfortable pointer target.
*/
const SLOT_PX = 14;
const SLOT_H = "h-3.5"; // Must equal SLOT_PX — the overlays position in pixels.

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function ScheduleGridPicker({
  bookings,
  value,
  onChange,
}: {
  readonly bookings: ScheduleBooking[];
  /** Every window currently chosen. Empty means the section has no timetable. */
  readonly value: readonly ClassSchedule[];
  readonly onChange: (next: ClassSchedule[]) => void;
}) {
  // Anchor slot of a drag in progress, or null. Held in state (not a ref) so the
  // preview repaints as the pointer moves.
  const [anchor, setAnchor] = useState<{ day: number; slot: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  /*
    Set when a drag STARTS on a slot that is already selected. A press-and-release
    there means "remove this window"; the same press dragged elsewhere means
    "extend it", so the intent is only settled at pointer-up.
  */
  const removeCandidate = useRef<{ day: number; slot: number } | null>(null);

  /*
    Which (day, slot) pairs are already taken, and by what. Built once per
    bookings change rather than asked per cell — 7 x 32 cells would otherwise
    re-scan every booking 224 times a paint.

    A LIST per slot, not one booking. Two DIFFERENT sections can make the same
    hour unavailable — this teacher is already teaching in another laboratory,
    AND this laboratory already has someone else's class. Both are real reasons
    and an admin needs to see both; keeping one booking per slot meant whichever
    was iterated last silently replaced the other.
  */
  const busy = useMemo(() => {
    const map = new Map<string, ScheduleBooking[]>();
    for (const booking of bookings) {
      // A booking is a LIST of windows now — a section meeting twice occupies
      // the room twice, and reading only the first would leave its second
      // window looking free.
      for (const block of booking.schedule) {
        const from = Math.max(0, timeToSlot(block.startTime));
        const to = Math.min(TOTAL_SLOTS, timeToSlot(block.endTime));
        for (const day of block.days) {
          for (let slot = from; slot < to; slot += 1) {
            const key = `${day}:${slot}`;
            const at = map.get(key);
            if (at) {
              // A section meeting twice in one slot is impossible, but the same
              // section can be reached through both reasons — do not list it
              // against itself.
              if (!at.some((b) => b.classId === booking.classId)) at.push(booking);
            } else {
              map.set(key, [booking]);
            }
          }
        }
      }
    }
    return map;
  }, [bookings]);

  const isBusy = (day: number, slot: number) => busy.get(`${day}:${slot}`)?.length;

  const runs = useMemo(() => toRuns(value), [value]);

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

  const emit = (next: Map<number, Run[]>) => {
    for (const [day, dayRuns] of next) {
      if (dayRuns.length === 0) next.delete(day);
    }
    onChange(toBlocks(next));
  };

  /** Adds a window. Overlapping or abutting ones on that day become one. */
  const commit = (day: number, from: number, to: number) => {
    const next = new Map(runs);
    next.set(day, mergeRuns([...(next.get(day) ?? []), { from, to: to + 1 }]));
    emit(next);
  };

  /** Drops the one window covering this slot, leaving that day's others alone. */
  const removeAt = (day: number, slot: number) => {
    const next = new Map(runs);
    next.set(day, (next.get(day) ?? []).filter((r) => slot < r.from || slot >= r.to));
    emit(next);
  };

  const endGesture = () => {
    dragging.current = false;
    removeCandidate.current = null;
    setAnchor(null);
    setHover(null);
  };

  const blocks = toBlocks(runs);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">
          Drag down a column for each meeting — drag again on another day to add a
          second one. Click a blue block to remove it. Shaded slots name the
          section already booked there.
        </p>
        {blocks.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-platform underline underline-offset-2 hover:text-platform-700"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <div className="min-w-[560px] select-none">
          <div className="flex border-b border-[var(--border-subtle)] bg-slate-50/70">
            <div className="w-14 shrink-0" />
            {DAYS.map((d) => (
              <div
                key={d}
                className={cn(
                  "flex-1 py-1.5 text-center text-xs font-medium",
                  (runs.get(d)?.length ?? 0) > 0
                    ? "text-platform-700"
                    : "text-[var(--text-muted)]",
                )}
              >
                {DAY_SHORT[d]}
              </div>
            ))}
          </div>

          <div
            className="flex"
            onPointerUp={() => {
              const pending = removeCandidate.current;
              // A press that never moved, on a slot already selected, removes it.
              if (pending && hover === pending.slot) removeAt(pending.day, pending.slot);
              else if (previewRange) {
                commit(previewRange.day, previewRange.from, previewRange.to);
              }
              endGesture();
            }}
            onPointerLeave={endGesture}
          >
            <div className="w-14 shrink-0">
              {Array.from({ length: TOTAL_SLOTS }, (_, slot) => (
                <div
                  key={slot}
                  className={cn(
                    SLOT_H,
                    "pr-1 text-right text-[10px] leading-[14px] text-[var(--text-muted)]",
                    slot % SLOTS_PER_HOUR !== 0 && "invisible",
                  )}
                >
                  {formatTime12(slotToTime(slot))}
                </div>
              ))}
            </div>

            {DAYS.map((day) => (
              <DayColumn
                key={day}
                day={day}
                busy={busy}
                selected={runs.get(day) ?? EMPTY_RUNS}
                preview={
                  previewRange?.day === day
                    ? { from: previewRange.from, to: previewRange.to + 1 }
                    : null
                }
                onPointerDownSlot={(slot) => {
                  if (busy.get(`${day}:${slot}`)) return;
                  dragging.current = true;
                  const inSelection = (runs.get(day) ?? []).some(
                    (r) => slot >= r.from && slot < r.to,
                  );
                  removeCandidate.current = inSelection ? { day, slot } : null;
                  setAnchor({ day, slot });
                  setHover(slot);
                }}
                onPointerMoveSlot={(slot) => {
                  if (!dragging.current || anchor?.day !== day) return;
                  // Moved off the pressed slot: this is a drag, not a click, so
                  // it can no longer mean "remove".
                  if (removeCandidate.current && slot !== removeCandidate.current.slot) {
                    removeCandidate.current = null;
                  }
                  setHover(slot);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {blocks.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {blocks.map((block) => (
            <li key={`${block.startTime}-${block.endTime}-${block.days.join()}`}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-platform-50 px-2.5 py-1 text-xs font-medium text-platform-700">
                {block.days.map((d) => DAY_SHORT[d]).join(", ")} ·{" "}
                {formatTime12(block.startTime)}–{formatTime12(block.endTime)}
                <button
                  type="button"
                  aria-label={`Remove ${block.days.map((d) => DAY_SHORT[d]).join(", ")} ${formatTime12(block.startTime)} to ${formatTime12(block.endTime)}`}
                  onClick={() =>
                    onChange(blocks.filter((other) => other !== block))
                  }
                  className="text-platform-500 transition-colors hover:text-platform-800"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
          <li className="self-center text-xs text-[var(--text-muted)]">
            (Philippine time)
          </li>
        </ul>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          No hours selected — the section will be created without a timetable.
        </p>
      )}
    </div>
  );
}

/** Shared empty array, so an unselected column keeps the same prop identity. */
const EMPTY_RUNS: Run[] = [];

/**
 * Why this booking blocks the slot, in two words.
 *
 * A section can be BOTH — the same teacher in the same room — in which case the
 * teacher is the more specific fact and the one named. Knowing which of the two
 * it is decides what an admin can do about it: a laboratory clash is solved by
 * moving the room, a teacher clash is not.
 */
function reasonLabel(booking: ScheduleBooking): string {
  return booking.reasons.includes("TEACHER") ? "teacher busy" : "lab in use";
}

/** The full sentence, for the tooltip that still carries everything. */
function describeBooking(booking: ScheduleBooking): string {
  const who = booking.reasons.includes("TEACHER") ? "this teacher" : "this laboratory";
  return `${booking.classLabel} — ${booking.className} (${who} is busy)`;
}

/**
 * One day, drawn as a STATIC grid with positioned overlays.
 *
 * The version this replaced rendered 32 interactive cells per column — 224 in
 * total — each rebuilding a tooltip string and a six-argument class list. A drag
 * calls setHover on every pointer move, so all 224 re-rendered on every mouse
 * step and the drag visibly lagged behind the cursor.
 *
 * Now the rows are inert background, the booked runs are one element each rather
 * than one per half-hour, and each selected window is a single absolutely
 * positioned div. A pointer move re-renders one column and repaints one
 * rectangle.
 *
 * The slot is derived from the pointer's offset rather than from per-cell
 * handlers, which is also what lets a drag keep tracking when the pointer moves
 * faster than the cells can fire enter events.
 */
const DayColumn = memo(function DayColumn({
  day,
  busy,
  selected,
  preview,
  onPointerDownSlot,
  onPointerMoveSlot,
}: {
  readonly day: number;
  readonly busy: Map<string, ScheduleBooking[]>;
  /** Every window chosen on this day. Several, since each drag adds one. */
  readonly selected: readonly Run[];
  readonly preview: Run | null;
  readonly onPointerDownSlot: (slot: number) => void;
  readonly onPointerMoveSlot: (slot: number) => void;
}) {
  /*
    Contiguous booked runs, not one block per half-hour. A two-hour class is one
    labelled rectangle instead of four abutting ones whose borders read as four
    separate bookings.

    Broken on the SET of sections holding the slot, not on one classId: an hour
    held by AT-1234 alone and the next hour held by AT-1234 *and* CS-101 are
    different facts, and merging them would put one label on a block where the
    label is only true for half of it.
  */
  const bookedRuns = useMemo(() => {
    const signature = (at: ScheduleBooking[]) =>
      at.map((b) => b.classId).sort().join("|");

    const out: { from: number; to: number; at: ScheduleBooking[] }[] = [];
    let current: { from: number; to: number; at: ScheduleBooking[] } | null = null;
    for (let slot = 0; slot < TOTAL_SLOTS; slot += 1) {
      const at = busy.get(`${day}:${slot}`);
      if (at?.length && current && signature(current.at) === signature(at)) {
        current.to = slot + 1;
      } else if (at?.length) {
        if (current) out.push(current);
        current = { from: slot, to: slot + 1, at };
      } else if (current) {
        out.push(current);
        current = null;
      }
    }
    if (current) out.push(current);
    return out;
  }, [busy, day]);

  const slotFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    return Math.min(TOTAL_SLOTS - 1, Math.max(0, Math.floor(y / SLOT_PX)));
  };

  return (
    <div
      className="relative flex-1 cursor-pointer border-l border-[var(--border-subtle)]"
      style={{ height: TOTAL_SLOTS * SLOT_PX }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onPointerDownSlot(slotFromEvent(e));
      }}
      onPointerMove={(e) => onPointerMoveSlot(slotFromEvent(e))}
    >
      {/* Inert hour rules. Rendered once; nothing here reacts to a drag. */}
      {Array.from({ length: TOTAL_SLOTS }, (_, slot) => (
        <div
          key={slot}
          className={cn(
            SLOT_H,
            slot % SLOTS_PER_HOUR === 0
              ? "border-b border-[var(--border-subtle)]"
              : "border-b border-transparent",
          )}
        />
      ))}

      {bookedRuns.map((run) => {
        const slots = run.to - run.from;
        // When two sections hold the slot, name the TEACHER clash: a laboratory
        // clash is solved by moving the room, a teacher clash is not, so it is
        // the one that decides whether this hour is usable at all.
        const [primary, ...rest] = [...run.at].sort(
          (a, b) =>
            Number(b.reasons.includes("TEACHER")) - Number(a.reasons.includes("TEACHER")),
        );
        return (
          <div
            key={`${run.from}-${run.at.map((b) => b.classId).join()}`}
            title={[primary, ...rest].map(describeBooking).join("\n")}
            style={{ top: run.from * SLOT_PX, height: slots * SLOT_PX }}
            className="absolute inset-x-0 flex flex-col items-center justify-center overflow-hidden px-0.5 text-center leading-[1.15] cursor-not-allowed bg-slate-200/80 [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(100,116,139,0.25)_3px,rgba(100,116,139,0.25)_6px)]"
          >
            {/*
              WHO is in the room, written in the block. It was a `title` alone,
              which meant an admin had to hover each grey stripe and wait for a
              native tooltip to find out what they were being blocked by — on the
              one screen whose whole purpose is showing what is already there.

              Only from two slots (28px) up: below that the text would be clipped
              to a sliver, which reads as a rendering fault. The tooltip still
              carries the full detail at every size.
            */}
            {slots >= 2 && (
              <>
                {/* max-w-full so `truncate` has something to truncate against —
                    a centered flex item sizes to its content otherwise. */}
                <span className="max-w-full truncate text-[9px] font-semibold text-slate-700">
                  {primary.classLabel}
                </span>
                {rest.length > 0 ? (
                  <span className="text-[9px] text-slate-600">+{rest.length} more</span>
                ) : (
                  slots >= 4 && (
                    <span className="text-[9px] text-slate-600">{reasonLabel(primary)}</span>
                  )
                )}
              </>
            )}
          </div>
        );
      })}

      {selected.map((run) => (
        <div
          key={run.from}
          style={{ top: run.from * SLOT_PX, height: (run.to - run.from) * SLOT_PX }}
          className="pointer-events-none absolute inset-x-0 rounded-sm bg-platform-500/90"
        />
      ))}

      {preview && preview.to > preview.from && (
        <div
          style={{ top: preview.from * SLOT_PX, height: (preview.to - preview.from) * SLOT_PX }}
          className="pointer-events-none absolute inset-x-0 rounded-sm bg-platform-500/70 ring-1 ring-inset ring-white/60"
        />
      )}
    </div>
  );
});
