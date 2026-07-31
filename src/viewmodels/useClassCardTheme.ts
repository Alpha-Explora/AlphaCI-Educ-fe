"use client";
// ============================================================================
// VIEWMODEL LAYER — the colour a teacher chose for a class card.
//
// WHERE THIS LIVES, AND WHY IT MATTERS:
// in `localStorage`, on the teacher's own machine. `ClassCohort` has no colour
// field — adding one means a backend DTO, a controller, a service and a schema
// migration across three repositories — and a card tint is a personal way of
// finding a class faster, not a fact about the class. Consequences to know:
//
//   - the same teacher on a second device sees the default colour again;
//   - two teachers sharing a class can pick different colours, and neither is
//     wrong;
//   - clearing site data resets the palette, which loses nothing but colour.
//
// Promote it to the API the day a colour has to mean the same thing to
// everyone (a printed timetable, a student-facing view). Until then this is the
// version that ships without a migration.
//
// All cards on the page read one store, so a change repaints every copy of that
// class at once — including one already rendered in another list. That is why
// this is a subscription rather than component state.
// ============================================================================
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { cardTheme, DEFAULT_CARD_THEME, type CardTheme } from "@/config/cardThemes";

const STORAGE_KEY = "alphaci.classCardThemes";
/** Same-tab notification; `storage` only fires in the OTHER tabs. */
const CHANGE_EVENT = "alphaci:class-card-themes";
const EMPTY = "{}";

type ThemeMap = Record<string, string>;

/**
 * The raw stored string, NOT the parsed object.
 *
 * useSyncExternalStore compares snapshots by identity, so returning a fresh
 * object here would report a change on every render and loop forever. A string
 * from localStorage is equal to itself until it is actually rewritten.
 */
function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY;
  } catch {
    // Private mode / storage disabled: colours simply stop persisting.
    return EMPTY;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parse(raw: string): ThemeMap {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: ThemeMap = {};
    for (const [key, themeId] of Object.entries(value as Record<string, unknown>)) {
      if (typeof themeId === "string") out[key] = themeId;
    }
    return out;
  } catch {
    return {};
  }
}

export interface ClassCardThemesVM {
  /** The theme to paint a class with — the default until one is chosen. */
  themeFor: (classId: string) => CardTheme;
  /** The chosen id, or null when the teacher hasn't picked one. */
  chosenIdFor: (classId: string) => string | null;
  setTheme: (classId: string, themeId: string) => void;
}

export function useClassCardThemes(): ClassCardThemesVM {
  // Server render and hydration both see "{}" — the stored value is picked up
  // on the next tick, so a colour fades in rather than mismatching the HTML.
  const raw = useSyncExternalStore(subscribe, readRaw, () => EMPTY);
  const map = useMemo(() => parse(raw), [raw]);

  const setTheme = useCallback((classId: string, themeId: string) => {
    try {
      const next = { ...parse(readRaw()), [classId]: themeId };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Nothing to recover: the picker just won't stick this session.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return {
    themeFor: (classId) => (classId in map ? cardTheme(map[classId]) : DEFAULT_CARD_THEME),
    chosenIdFor: (classId) => map[classId] ?? null,
    setTheme,
  };
}
