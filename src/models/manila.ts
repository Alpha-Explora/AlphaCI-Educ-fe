// ============================================================================
// MODEL LAYER — reading an instant in PHILIPPINE time.
//
// Class schedules are expressed and enforced in Asia/Manila, so a label built
// from the viewer's own timezone would name the wrong day: a student on a laptop
// set to UTC would be told their 08:00 Manila class opens "Sunday at 00:00".
//
// Manila is UTC+08:00 with NO daylight saving — it has not observed DST since
// 1978 — which is why this is arithmetic rather than an Intl formatter with a
// `timeZone` option. That is a deliberate simplification and the reason this file
// is four lines long; it is also exactly what must be replaced if this product
// ever serves a school in a DST-observing zone.
//
// Mirrors the server's formatManilaMoment in common/class-schedule.util.ts. The
// server is the authority on WHEN a class opens; this only renders the instant it
// already sent.
// ============================================================================

/** Manila is UTC+8, always. */
const MANILA_OFFSET_MINUTES = 8 * 60;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * "Monday at 08:00" for an ISO instant, read in Manila time.
 *
 * Shifts the clock and reads the UTC fields, rather than reading local fields off
 * a Date — the latter describes the VIEWER's Monday, which is the bug.
 */
export function manilaMoment(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + MANILA_OFFSET_MINUTES * 60_000);
  const day = DAY_NAMES[shifted.getUTCDay()];
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${day} at ${hh}:${mm}`;
}
