// ============================================================================
// MODEL LAYER — converting between a week GRID and a list of ClassSchedules.
//
// The booking grid edits a schedule as SLOTS: per day, which half-hours are
// selected. The wire carries WINDOWS: `{ days[], startTime, endTime }`, one
// entry covering every day that shares those hours. Neither shape is wrong —
// slots are what a drag produces, windows are what a timetable means — so the
// translation has to live somewhere, and it lives here rather than inside the
// component that draws it.
//
// WHY IT IS NOT INSIDE ScheduleGridPicker
//
// Because it is where the bugs are. Merging a drag into an existing selection,
// coalescing runs that touch, and re-grouping days that ended up on identical
// hours are three pieces of arithmetic with edge cases at every boundary, and
// none of them need React to be exercised. A component can only be checked by
// dragging; this can be checked by reading.
//
// THE INVARIANT THIS FILE OWNS: what comes out of `toBlocks` must be something
// the SERVER will accept. The server refuses a section whose own windows
// overlap (see classes.service.ts), so `mergeRuns` joining overlapping and
// touching runs is not a tidiness measure — it is what keeps a natural gesture
// from producing a payload that is rejected at Save.
// ============================================================================
import type { ClassSchedule } from "./types";

/**
 * The bookable day, in 30-minute steps.
 *
 * 6am–10pm covers a school day; 30 minutes is the coarsest step that still
 * expresses the timetables this product already has (13:00–15:40 exists, so
 * hour-only steps would have been unable to represent real data).
 */
export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 22;
export const GRID_STEP_MIN = 30;
export const GRID_SLOTS_PER_HOUR = 60 / GRID_STEP_MIN;
export const GRID_TOTAL_SLOTS = (GRID_END_HOUR - GRID_START_HOUR) * GRID_SLOTS_PER_HOUR;

/** A half-open run of slots on one day: `to` is exclusive, like `endTime`. */
export interface Run {
  from: number;
  to: number;
}

/**
 * The selection as the GRID thinks of it: per day, a set of slot runs.
 *
 * The wire shape groups days under a shared window, which is compact to store
 * and awkward to edit — adding an hour to Monday alone means splitting a window
 * that three days share. Editing happens in this shape and converts back once,
 * so no drag handler ever has to reason about a day it did not touch.
 */
export type DayRuns = ReadonlyMap<number, Run[]>;

/** Slot index -> "HH:MM". Index 0 is GRID_START_HOUR:00. */
export function slotToTime(slot: number): string {
  const mins = GRID_START_HOUR * 60 + slot * GRID_STEP_MIN;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

/**
 * "HH:MM" -> slot index. May be negative or past the end for a window outside
 * the drawn day; callers clamp, because a 5am class is real and must not throw.
 */
export function timeToSlot(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60 + m - GRID_START_HOUR * 60) / GRID_STEP_MIN;
}

/**
 * Sorts and coalesces runs that overlap OR touch.
 *
 * Touching runs are joined (`from <= to`, not `<`): an admin who drags 8–9 and
 * then 9–10 means one 8–10 class, and leaving them apart would send two windows
 * the server has no reason to keep separate. Overlapping ones MUST be joined —
 * see the invariant in the header.
 */
export function mergeRuns(runs: readonly Run[]): Run[] {
  const sorted = [...runs].sort((a, b) => a.from - b.from);
  const out: Run[] = [];
  for (const run of sorted) {
    const last = out[out.length - 1];
    if (last && run.from <= last.to) last.to = Math.max(last.to, run.to);
    else out.push({ ...run });
  }
  return out;
}

/** Wire shape -> grid shape. Unparseable or inverted windows are dropped. */
export function toRuns(blocks: readonly ClassSchedule[]): Map<number, Run[]> {
  const runs = new Map<number, Run[]>();
  for (const block of blocks) {
    const from = timeToSlot(block.startTime);
    const to = timeToSlot(block.endTime);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;
    for (const day of block.days) {
      runs.set(day, mergeRuns([...(runs.get(day) ?? []), { from, to }]));
    }
  }
  return runs;
}

/**
 * Grid shape -> wire shape, re-grouping days that ended up on identical hours.
 *
 * Without the grouping, "Mon, Wed and Fri, all 8–10" would be three windows that
 * describe themselves three times over. With it, the common timetable stays the
 * one-line thing it always was, and only genuinely different hours split.
 */
export function toBlocks(runs: DayRuns, labOrgId?: string): ClassSchedule[] {
  const byWindow = new Map<string, { from: number; to: number; days: number[] }>();
  for (const [day, dayRuns] of runs) {
    for (const run of dayRuns) {
      const key = `${run.from}-${run.to}`;
      const entry = byWindow.get(key) ?? { from: run.from, to: run.to, days: [] };
      entry.days.push(day);
      byWindow.set(key, entry);
    }
  }
  return [...byWindow.values()]
    .sort((a, b) => a.from - b.from || Math.min(...a.days) - Math.min(...b.days))
    .map((entry) => ({
      days: [...entry.days].sort((a, b) => a - b),
      startTime: slotToTime(entry.from),
      endTime: slotToTime(entry.to),
      // Stamped here rather than by the caller so a window can never come back
      // from the grid without the room it was drawn in.
      ...(labOrgId && { labOrgId }),
    }));
}

/**
 * The room a window belongs to, for grouping in the editor.
 *
 * `fallback` is the first room available to the section. A window with no room
 * of its own predates the field, and treating it as unassigned would hide it
 * from every tab — so it is shown under the first room, where an admin can see
 * it and redraw it. The SERVER resolves the same absence against the section's
 * meeting labs when it matters; this is only about which tab draws it.
 */
export function blockLabOrFallback(
  block: ClassSchedule,
  fallback: string | undefined,
): string | undefined {
  return block.labOrgId ?? fallback;
}
