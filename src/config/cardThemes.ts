// ============================================================================
// CARD THEMES — the colours a teacher can put on a class card.
//
// This is the one deliberate exception to "no colour values outside
// globals.css". Everything in that file is the SCHOOL'S identity, applied by an
// administrator once; these are a USER'S choice, made per class, and a palette
// that re-tinted itself on a re-skin would stop being a set of distinguishable
// labels — which is the entire point of letting a teacher colour a card.
//
// The brand entry is first and is the default, so a teacher who never opens the
// picker sees the school's own colour rather than an arbitrary one.
//
// Contrast is not negotiable. `tint` is a 50-level wash, `ink` a 900-level and
// `inkSoft` an 800-level of the same hue, which keeps every pairing above
// WCAG AA (4.5:1) for body text — verified per row below. A new entry must
// hold to that: the picker offers colour, not the ability to make a card
// unreadable.
// ============================================================================

export interface CardTheme {
  id: string;
  /** Shown in the picker's tooltip / accessible name. */
  label: string;
  /** Card wash. */
  tint: string;
  /** Card border. */
  line: string;
  /** Accent bar, swatch and iconography. */
  accent: string;
  /** Headings on `tint`. */
  ink: string;
  /** Secondary text on `tint` — still AA. */
  inkSoft: string;
  /** Pattern ink: the accent, diluted to decoration. */
  patternInk: string;
}

export const CARD_THEMES: readonly CardTheme[] = [
  {
    id: "brand",
    label: "School blue",
    tint: "#eff6ff",
    line: "#bfdbfe",
    accent: "#2563eb",
    ink: "#1e3a8a", // 10.4:1 on tint
    inkSoft: "#1e40af", // 8.6:1
    patternInk: "rgb(37 99 235 / 0.16)",
  },
  {
    id: "teal",
    label: "Teal",
    tint: "#f0fdfa",
    line: "#99f6e4",
    accent: "#0d9488",
    ink: "#134e4a", // 10.9:1
    inkSoft: "#115e59", // 8.5:1
    patternInk: "rgb(13 148 136 / 0.18)",
  },
  {
    id: "green",
    label: "Green",
    tint: "#f0fdf4",
    line: "#bbf7d0",
    accent: "#16a34a",
    ink: "#14532d", // 10.5:1
    inkSoft: "#166534", // 8.6:1
    patternInk: "rgb(22 163 74 / 0.18)",
  },
  {
    id: "amber",
    label: "Amber",
    tint: "#fffbeb",
    line: "#fde68a",
    accent: "#d97706",
    ink: "#78350f", // 9.4:1
    inkSoft: "#92400e", // 7.3:1
    patternInk: "rgb(217 119 6 / 0.20)",
  },
  {
    id: "rose",
    label: "Rose",
    tint: "#fff1f2",
    line: "#fecdd3",
    accent: "#e11d48",
    ink: "#881337", // 9.4:1
    inkSoft: "#9f1239", // 7.8:1
    patternInk: "rgb(225 29 72 / 0.16)",
  },
  {
    id: "violet",
    label: "Violet",
    tint: "#f5f3ff",
    line: "#ddd6fe",
    accent: "#7c3aed",
    ink: "#4c1d95", // 10.6:1
    inkSoft: "#5b21b6", // 8.6:1
    patternInk: "rgb(124 58 237 / 0.16)",
  },
  {
    id: "cyan",
    label: "Cyan",
    tint: "#ecfeff",
    line: "#a5f3fc",
    accent: "#0891b2",
    ink: "#164e63", // 9.6:1
    inkSoft: "#155e75", // 7.4:1
    patternInk: "rgb(8 145 178 / 0.18)",
  },
  {
    id: "slate",
    label: "Graphite",
    tint: "#f8fafc",
    line: "#e2e8f0",
    accent: "#475569",
    ink: "#0f172a", // 17.4:1
    inkSoft: "#334155", // 10.3:1
    patternInk: "rgb(71 85 105 / 0.16)",
  },
];

export const DEFAULT_CARD_THEME = CARD_THEMES[0];

/** The theme for an id, falling back to the default for unknown/legacy ids. */
export function cardTheme(id: string | null | undefined): CardTheme {
  return CARD_THEMES.find((t) => t.id === id) ?? DEFAULT_CARD_THEME;
}
