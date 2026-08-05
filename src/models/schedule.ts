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

/** Whatever a caller might hold: a list, a legacy bare object, or nothing. */
export type ScheduleInput = ClassSchedule[] | ClassSchedule | null | undefined;

/**
 * Every window a class meets in, from whatever shape the record holds.
 *
 * THE ONE PLACE IN THE FRONTEND THAT KNOWS `schedule` CAN BE EITHER. Rows written
 * before the field became a list still hold a bare object, and a reader that
 * assumed an array would read `undefined` for `.length`, call the class
 * unscheduled, and render it as always open — mislabelling exactly the sections
 * that have a timetable. Mirrors the server's scheduleBlocks() precisely.
 *
 * An empty list means the same as no schedule: no restriction.
 */
export function scheduleBlocks(schedule: ScheduleInput): ClassSchedule[] {
  if (!schedule) return [];
  return Array.isArray(schedule) ? schedule : [schedule];
}

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
export function isEnforceable(schedule: ScheduleInput): boolean {
  return usableBlocks(schedule).length > 0;
}

/** The windows that can actually gate anything — malformed ones dropped. */
function usableBlocks(schedule: ScheduleInput): ClassSchedule[] {
  return scheduleBlocks(schedule).filter(isBlockEnforceable);
}

function isBlockEnforceable(block: ClassSchedule | null | undefined): boolean {
  if (!block) return false;
  if (!Array.isArray(block.days) || block.days.length === 0) return false;
  const start = parseHhMm(block.startTime);
  const end = parseHhMm(block.endTime);
  return start !== null && end !== null && end > start;
}

/** True when `at` is inside the weekly window — or there is no window at all. */
export function isInSession(schedule: ScheduleInput, at: Date = new Date()): boolean {
  const blocks = usableBlocks(schedule);
  if (blocks.length === 0) return true;
  // ANY window: a section meeting Mon 8–10 and Wed 1–3 is in session in either.
  return blocks.some((block) => isBlockInSession(block, at));
}

function isBlockInSession(block: ClassSchedule, at: Date): boolean {
  const { day, minuteOfDay } = manilaNow(at);
  if (!block.days.includes(day)) return false;

  const start = parseHhMm(block.startTime) as number;
  const end = parseHhMm(block.endTime) as number;
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
  schedule: ScheduleInput,
  at: Date = new Date(),
): number | null {
  const blocks = usableBlocks(schedule);
  if (blocks.length === 0 || isInSession(schedule, at)) return null;

  // The SOONEST of every window. Taking the first block’s answer would tell a
  // student to come back Friday for a class that also meets Wednesday.
  let soonest: number | null = null;
  for (const block of blocks) {
    const mins = minutesUntilBlockOpens(block, at);
    if (mins !== null && (soonest === null || mins < soonest)) soonest = mins;
  }
  return soonest;
}

function minutesUntilBlockOpens(block: ClassSchedule, at: Date): number | null {
  const start = parseHhMm(block.startTime) as number;
  const { day, minuteOfDay } = manilaNow(at);

  // A day at a time, like the server's nextOpeningAt: eight iterations is
  // nothing, and the loop is obviously right at the two boundaries a closed-form
  // version keeps getting wrong — later today, and already finished today.
  for (let ahead = 0; ahead <= 7; ahead += 1) {
    const candidate = (day + ahead) % 7;
    if (!block.days.includes(candidate)) continue;
    if (ahead === 0 && minuteOfDay >= start) continue;
    return ahead * MINUTES_PER_DAY + start - minuteOfDay;
  }
  return null;
}

/** Minutes until the CURRENT window closes, or null when not in session. */
export function minutesUntilClose(
  schedule: ScheduleInput,
  at: Date = new Date(),
): number | null {
  // The window that is RUNNING, not the first one on the list — a section
  // meeting twice today would otherwise report the morning window’s end while
  // sitting in the afternoon one.
  const running = usableBlocks(schedule).find((block) => isBlockInSession(block, at));
  if (!running) return null;
  const end = parseHhMm(running.endTime) as number;
  return end - manilaNow(at).minuteOfDay;
}

/**
 * "19:30" -> "7:30pm", "08:00" -> "8am", "12:00" -> "12pm", "00:00" -> "12am".
 *
 * DISPLAY ONLY. `ClassSchedule.startTime` is stored and enforced as 24-hour
 * "HH:MM" — the server parses it, the DTO validates it, and the `<input
 * type="time">` in the editor round-trips it. Nothing here may travel back into
 * a payload; this is the last step before a string reaches a screen.
 *
 * A whole hour drops its ":00", because "8am" is how a timetable is read aloud
 * and "8:00am" is a form field. Minutes are kept zero-padded when present, so
 * 19:05 is "7:05pm" rather than "7:5pm".
 */
export function formatTime12(hhmm: string): string {
  const mins = parseHhMm(hhmm);
  if (mins === null) return hhmm; // Unparseable: show what was stored, never "NaN".

  const hours24 = Math.floor(mins / 60);
  const minutes = mins % 60;
  const suffix = hours24 < 12 ? "am" : "pm";
  // 0 and 12 both display as 12 — midnight is 12am, noon is 12pm.
  const hours12 = hours24 % 12 || 12;

  return minutes === 0
    ? `${hours12}${suffix}`
    : `${hours12}:${String(minutes).padStart(2, "0")}${suffix}`;
}

/**
 * "Mon, Wed, Fri" — every day the section meets, across all its windows.
 *
 * Deliberately flattened: a caller asking only for days wants the shape of the
 * week, and "Mon, Wed / Fri" would need a second concept to render. Callers that
 * need the split render each block instead — see `describeBlock`.
 */
export function describeDays(schedule: ScheduleInput): string | null {
  const blocks = usableBlocks(schedule);
  if (blocks.length === 0) return null;
  const days = new Set(blocks.flatMap((b) => b.days));
  return WEEK_ORDER.filter((d) => days.has(d))
    .map((d) => DAY_SHORT[d])
    .join(", ");
}

/** "Mon, Wed · 8am–10am" — ONE window, days and times. */
export function describeBlock(block: ClassSchedule): string {
  const days = WEEK_ORDER.filter((d) => block.days.includes(d))
    .map((d) => DAY_SHORT[d])
    .join(", ");
  return `${days} · ${formatTime12(block.startTime)}–${formatTime12(block.endTime)}`;
}

/**
 * "Mon, Wed · 8am–10am and Fri · 1pm–3pm" — the whole timetable in one line.
 *
 * Joined with a word rather than a separator, because "Mon, Wed · 8am–10am · Fri
 * · 1pm–3pm" reads as one window with extra parts.
 */
export function describeSchedule(schedule: ScheduleInput): string | null {
  const blocks = usableBlocks(schedule);
  if (blocks.length === 0) return null;
  return blocks.map(describeBlock).join(" and ");
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
  schedule: ScheduleInput,
  at: Date = new Date(),
): string | null {
  const opening = nextOpeningInstant(schedule, at);
  return opening ? DAY_SHORT[opening.getUTCDay()] : null;
}

/**
 * The "HH:MM" the class next opens at — the SOONEST window, not the first.
 *
 * Derived from the same minutes-until arithmetic as `nextMeetingDay` rather than
 * read off a block, so the day and the time always name the same meeting. Read
 * a start time straight off `schedule[0]` and a section meeting Mon 8am and Wed
 * 1pm would, on a Tuesday, be announced as "Wed 8am".
 */
export function nextOpeningTime(
  schedule: ScheduleInput,
  at: Date = new Date(),
): string | null {
  const opening = nextOpeningInstant(schedule, at);
  if (!opening) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(opening.getUTCHours())}:${pad(opening.getUTCMinutes())}`;
}

/** The next opening as a Manila-shifted Date whose UTC fields read as local. */
function nextOpeningInstant(schedule: ScheduleInput, at: Date): Date | null {
  const mins = minutesUntilOpen(schedule, at);
  if (mins === null) return null;
  return new Date(at.getTime() + (mins + MANILA_OFFSET_MINUTES) * 60_000);
}

// ---------------------------------------------------------------------------
// Picking the section a teacher is most likely about to run.
// ---------------------------------------------------------------------------

/** The subset of a class this module needs — keeps callers free of ClassCohort. */
export interface ScheduledClass {
  id: string;
  schedule?: ClassSchedule[] | ClassSchedule;
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
