// ============================================================================
// MODEL LAYER — reading a class's weekly meeting window, in PHILIPPINE time.
//
// Mirrors the server's common/class-schedule.util.ts. The SERVER IS THE
// AUTHORITY: every gate is enforced there against its own clock, and nothing
// here grants or refuses anything. This exists so the teacher's screens can say
// which section is meeting right now — which is what turns the class-code card
// from a dropdown into a single button — and so the Schedule tab can label a
// section "in session" without a round trip per row.
//
// The consequence of that split is that this copy is allowed to be WRONG. A
// laptop with a skewed clock, or a page left open across a boundary, will
// disagree with the server for a while. Every such disagreement must fail
// harmlessly: the wrong section is pre-selected (the teacher changes it), or a
// badge is stale (it refreshes). Nothing here may be the reason a student is let
// in or kept out.
//
// Manila is UTC+08:00 with NO daylight saving, which is why this is arithmetic
// rather than an Intl formatter — the same deliberate simplification, with the
// same caveat, as models/manila.ts. Replace both together if this ever serves a
// school in a DST zone.
// ============================================================================
import type { ClassSchedule } from "./types";

/** Manila is UTC+8, always. */
const MANILA_OFFSET_MINUTES = 8 * 60;
const MINUTES_PER_DAY = 24 * 60;

/** Monday-first for display; values are JS `getUTCDay()` (0 = Sunday). */
export const DAY_SHORT: Readonly<Record<number, string>> = {
  0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
};

/** A school week starts on Monday; Sunday is day 0 and belongs at the end. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** "HH:MM" -> minutes since midnight, or null when unparseable. */
function parseHhMm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

/** Where an instant falls in the Manila week. */
function manilaNow(at: Date): { day: number; minuteOfDay: number } {
  const shifted = new Date(at.getTime() + MANILA_OFFSET_MINUTES * 60_000);
  return {
    day: shifted.getUTCDay(),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/**
 * Whether a schedule is usable as a gate.
 *
 * An absent schedule, no days, or a window that spans no time all mean "no
 * restriction" rather than "never open" — matching the server, where the
 * direction is chosen so a malformed schedule cannot lock a class out entirely.
 */
export function isEnforceable(schedule: ClassSchedule | null | undefined): boolean {
  if (!schedule) return false;
  if (!Array.isArray(schedule.days) || schedule.days.length === 0) return false;
  const start = parseHhMm(schedule.startTime);
  const end = parseHhMm(schedule.endTime);
  return start !== null && end !== null && end > start;
}

/** True when `at` is inside the weekly window — or there is no window at all. */
export function isInSession(
  schedule: ClassSchedule | null | undefined,
  at: Date = new Date(),
): boolean {
  if (!isEnforceable(schedule)) return true;

  const { day, minuteOfDay } = manilaNow(at);
  if (!schedule!.days.includes(day)) return false;

  const start = parseHhMm(schedule!.startTime) as number;
  const end = parseHhMm(schedule!.endTime) as number;
  // End-exclusive: an 08:00–10:00 class is over AT 10:00.
  return minuteOfDay >= start && minuteOfDay < end;
}

/**
 * Minutes from `at` until the window next opens, or null when it is open now or
 * has no schedule.
 *
 * Returns a DURATION rather than an instant because every caller wants to sort
 * or compare — "which section is up next" is the question the code card asks —
 * and a number is directly comparable where two ISO strings are not.
 */
export function minutesUntilOpen(
  schedule: ClassSchedule | null | undefined,
  at: Date = new Date(),
): number | null {
  if (!isEnforceable(schedule) || isInSession(schedule, at)) return null;

  const start = parseHhMm(schedule!.startTime) as number;
  const { day, minuteOfDay } = manilaNow(at);

  // A day at a time, like the server's nextOpeningAt: eight iterations is
  // nothing, and the loop is obviously right at the two boundaries a closed-form
  // version keeps getting wrong — later today, and already finished today.
  for (let ahead = 0; ahead <= 7; ahead += 1) {
    const candidate = (day + ahead) % 7;
    if (!schedule!.days.includes(candidate)) continue;
    if (ahead === 0 && minuteOfDay >= start) continue;
    return ahead * MINUTES_PER_DAY + start - minuteOfDay;
  }
  return null;
}

/** Minutes until the CURRENT window closes, or null when not in session. */
export function minutesUntilClose(
  schedule: ClassSchedule | null | undefined,
  at: Date = new Date(),
): number | null {
  if (!isEnforceable(schedule) || !isInSession(schedule, at)) return null;
  const end = parseHhMm(schedule!.endTime) as number;
  return end - manilaNow(at).minuteOfDay;
}

/** "Mon, Wed, Fri" — the days only, for a compact row. */
export function describeDays(schedule: ClassSchedule | null | undefined): string | null {
  if (!isEnforceable(schedule)) return null;
  return WEEK_ORDER.filter((d) => schedule!.days.includes(d))
    .map((d) => DAY_SHORT[d])
    .join(", ");
}

/** "Mon, Wed, Fri · 08:00–10:00" — days and times, without the timezone suffix. */
export function describeSchedule(schedule: ClassSchedule | null | undefined): string | null {
  const days = describeDays(schedule);
  if (!days) return null;
  return `${days} · ${schedule!.startTime}–${schedule!.endTime}`;
}

/** "in 25 minutes" / "in 3 hours" / "in 2 days" — a duration, humanised. */
export function humaniseMinutes(total: number): string {
  if (total < 60) return `${Math.max(1, Math.round(total))} min`;
  if (total < MINUTES_PER_DAY) {
    const hours = Math.round(total / 60);
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  const days = Math.round(total / MINUTES_PER_DAY);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** The next weekday name the class meets, from `at`. Null when unscheduled. */
export function nextMeetingDay(
  schedule: ClassSchedule | null | undefined,
  at: Date = new Date(),
): string | null {
  const mins = minutesUntilOpen(schedule, at);
  if (mins === null) return null;
  const opensAt = new Date(at.getTime() + mins * 60_000);
  const shifted = new Date(opensAt.getTime() + MANILA_OFFSET_MINUTES * 60_000);
  return DAY_SHORT[shifted.getUTCDay()];
}

// ---------------------------------------------------------------------------
// Picking the section a teacher is most likely about to run.
// ---------------------------------------------------------------------------

/** The subset of a class this module needs — keeps callers free of ClassCohort. */
export interface ScheduledClass {
  id: string;
  schedule?: ClassSchedule;
}

/**
 * Which section to pre-select on the class-code card.
 *
 * The ordering is the whole point, because it is what lets the card be a single
 * button instead of a dropdown:
 *
 *   1. A section meeting RIGHT NOW. If several are (a teacher double-booked, or
 *      two sections sharing a slot), the first is taken — any of them is a
 *      defensible guess and the teacher can still change it.
 *   2. Otherwise the section opening SOONEST, so arriving five minutes early
 *      still lands on the right class.
 *   3. Otherwise the first section at all, which is what an unscheduled
 *      timetable degrades to.
 *
 * Returns an id rather than the object so callers keep their own richer type.
 */
export function classMeetingNow<T extends ScheduledClass>(
  classes: readonly T[],
  at: Date = new Date(),
): T | null {
  // Only sections with a REAL window count as "meeting now". Without this an
  // unscheduled section — which isInSession calls open, meaning "unrestricted" —
  // would outrank the section actually in the room.
  const scheduled = classes.filter((c) => isEnforceable(c.schedule));

  const inSession = scheduled.find((c) => isInSession(c.schedule, at));
  if (inSession) return inSession;

  let soonest: T | null = null;
  let soonestMins = Number.POSITIVE_INFINITY;
  for (const c of scheduled) {
    const mins = minutesUntilOpen(c.schedule, at);
    if (mins !== null && mins < soonestMins) {
      soonest = c;
      soonestMins = mins;
    }
  }

  return soonest ?? classes[0] ?? null;
}
