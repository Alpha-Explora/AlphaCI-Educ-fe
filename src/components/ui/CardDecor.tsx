// ============================================================================
// VIEW LAYER — decorative background patterns for cards.
//
// A grid of identical cards is hard to navigate by memory: every course looks
// like every other course, so a teacher re-reads the title each time. Giving
// each card a different texture makes it findable at a glance ("the striped
// one") without adding a single word to the page.
//
// The pattern is DERIVED FROM THE CARD'S IDENTITY, not from its position in the
// grid — see `patternFor`. Keying off the array index would reshuffle every
// card's texture whenever a course is added, removed or filtered, which throws
// away the recognition the texture exists to create.
//
// Rules that keep this decoration rather than noise:
//   - drawn in ONE ink, always a translucent version of the card's own accent;
//   - masked to fade out towards the bottom-left, which is where cards put
//     their title and stats, so text never sits on texture;
//   - `aria-hidden` and `pointer-events-none` — it is not content, and it must
//     not intercept a click meant for the card's link.
// ============================================================================
import type { CSSProperties } from "react";
import { cn } from "./cn";

export type CardPattern =
  | "dots"
  | "grid"
  | "diagonal"
  | "rings"
  | "ruled"
  | "crosshatch"
  | "chevron"
  | "scatter";

/** Stable order — `patternFor` indexes into this, so do not sort it. */
export const CARD_PATTERNS: readonly CardPattern[] = [
  "dots",
  "grid",
  "diagonal",
  "rings",
  "ruled",
  "crosshatch",
  "chevron",
  "scatter",
];

/**
 * A pattern for a seed, stable for the life of that seed.
 *
 * Pass something that identifies the THING — a course code, a class id — so the
 * same course keeps the same texture across sessions, page sizes and sort
 * orders. djb2 rather than a lookup table: the seeds are unbounded, and any
 * hash spreads short, similar strings ("IS-2601" / "IS-2602") across different
 * buckets, which a naive `charCodeAt(0)` would not.
 */
export function patternFor(seed: string): CardPattern {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  return CARD_PATTERNS[hash % CARD_PATTERNS.length];
}

/** Geometry per pattern. `ink` is any CSS colour — pass it pre-diluted. */
function geometry(pattern: CardPattern, ink: string): CSSProperties {
  switch (pattern) {
    case "grid":
      return {
        backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`,
        backgroundSize: "18px 18px",
      };
    case "diagonal":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${ink} 0 2px, transparent 2px 11px)`,
      };
    case "rings":
      return {
        backgroundImage: `repeating-radial-gradient(circle at 100% 0%, transparent 0 13px, ${ink} 13px 14px)`,
      };
    case "ruled":
      // The exercise-book rule, on the same 34px rhythm as the landing page.
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, ${ink} 0 1px, transparent 1px 14px)`,
      };
    case "crosshatch":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${ink} 0 1px, transparent 1px 9px), repeating-linear-gradient(-45deg, ${ink} 0 1px, transparent 1px 9px)`,
      };
    case "chevron":
      return {
        backgroundImage: `linear-gradient(135deg, ${ink} 25%, transparent 25%), linear-gradient(225deg, ${ink} 25%, transparent 25%)`,
        backgroundSize: "16px 16px",
      };
    case "scatter":
      return {
        backgroundImage: `radial-gradient(circle at 25% 25%, ${ink} 2px, transparent 2.5px), radial-gradient(circle at 75% 70%, ${ink} 1.5px, transparent 2px)`,
        backgroundSize: "26px 26px",
      };
    case "dots":
    default:
      return {
        backgroundImage: `radial-gradient(${ink} 1.5px, transparent 1.6px)`,
        backgroundSize: "14px 14px",
      };
  }
}

export function CardDecor({
  pattern,
  ink,
  className,
}: Readonly<{
  pattern: CardPattern;
  /** Translucent colour to draw in, e.g. "rgb(37 99 235 / 0.14)". */
  ink: string;
  className?: string;
}>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        className,
      )}
      style={{
        ...geometry(pattern, ink),
        // Strongest at the top-right corner, gone by the time it reaches the
        // title and the stats. Both spellings: -webkit- is still required on
        // Safari, and without it the pattern covers the whole card there.
        WebkitMaskImage:
          "radial-gradient(125% 125% at 100% 0%, #000 0%, rgb(0 0 0 / 0.35) 45%, transparent 78%)",
        maskImage:
          "radial-gradient(125% 125% at 100% 0%, #000 0%, rgb(0 0 0 / 0.35) 45%, transparent 78%)",
      }}
    />
  );
}
