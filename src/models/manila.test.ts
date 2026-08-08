// manilaMoment — "Monday at 08:00" for an instant, read in Manila time.
//
// Class schedules are Manila-local. Reading local fields off a Date describes
// the VIEWER's Monday, so a teacher checking the timetable from another
// timezone — or a CI runner in UTC — sees the wrong day for the same class.
import { describe, expect, it } from "vitest";
import { manilaMoment } from "./manila";

/**
 * INDEPENDENT ORACLE, deliberately.
 *
 * Hardcoding the strings the implementation already produces would pass even if
 * the offset arithmetic were wrong. Intl resolves Asia/Manila from the system
 * timezone database, so it agrees with the implementation only when the
 * implementation is actually correct.
 */
function expected(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const at = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${at("weekday")} at ${at("hour")}:${at("minute")}`;
}

describe("manilaMoment", () => {
  it("agrees with the system timezone database", () => {
    for (const iso of [
      "2026-08-02T17:00:00.000Z", // crosses into the next Manila day
      "2026-08-03T00:30:00.000Z",
      "2026-01-01T15:59:00.000Z",
      "2026-06-15T08:00:00.000Z",
      "2026-12-31T16:00:00.000Z", // crosses into the next Manila YEAR
    ]) {
      expect(manilaMoment(iso), iso).toBe(expected(iso));
    }
  });

  // THE BUG THIS EXISTS TO PREVENT. 17:00 UTC is already the next day in Manila
  // (+08:00), so anything reading the UTC or viewer-local day names the wrong one.
  it("rolls to the next day for an instant past 16:00 UTC", () => {
    const m = manilaMoment("2026-08-02T17:00:00.000Z");
    expect(m).toBe("Monday at 01:00");
    // 2026-08-02 is a Sunday in UTC — if this said Sunday, the shift was skipped.
    expect(m).not.toMatch(/Sunday/);
  });

  it("zero-pads hours and minutes", () => {
    // 00:05 Manila, which is 16:05 UTC the previous day.
    expect(manilaMoment("2026-08-02T16:05:00.000Z")).toMatch(/ at 00:05$/);
  });

  // Manila is a fixed +08:00 with no daylight saving, so the same wall clock
  // must come back in both hemispheric summers. A DST-aware offset would drift.
  it("uses a fixed offset across the year", () => {
    expect(manilaMoment("2026-01-15T04:00:00.000Z")).toMatch(/ at 12:00$/);
    expect(manilaMoment("2026-07-15T04:00:00.000Z")).toMatch(/ at 12:00$/);
  });
});
