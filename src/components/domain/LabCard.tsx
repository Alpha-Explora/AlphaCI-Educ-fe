"use client";
// ============================================================================
// VIEW LAYER — one laboratory, as a chooseable tile.
//
// THE WHOLE TILE IS THE BUTTON. It used to be a card with an "Enter lab"
// button inside it, which is fine for two labs and wrong for twenty: it puts
// two tab stops on every row, and it makes the 90% of the tile that isn't the
// button dead to the pointer. One <button> per lab means the tab order is
// exactly as long as the list, and the target is the size of the card.
//
// It is a <button>, not a <div onClick>, on purpose — Enter and Space, a real
// disabled state and a focus ring all come free, and none of them are worth
// re-implementing.
// ============================================================================
import { cn } from "@/components/ui/cn";
import type { AccessibleLab } from "@/models/types";

/**
 * The two characters on the tile.
 *
 * Initials alone are useless here, which is the whole reason this function
 * exists: a school's labs are called "Computer Laboratory 1", "Computer
 * Laboratory 2", "Computer Laboratory 3", and every one of those initialises
 * to "CL". The trailing number is the only part that differs, so when a name
 * ends in digits they win. Everything else falls back to initials.
 */
export function labMonogram(name: string): string {
  const trailingNumber = /(\d+)\s*$/.exec(name);
  if (trailingNumber) return trailingNumber[1].slice(-2);

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return ((words[0][0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

export function LabCard({
  lab,
  isOpening,
  disabled,
  onSelect,
  style,
}: {
  lab: AccessibleLab;
  /** This lab is the one being opened. */
  isOpening: boolean;
  /** Some lab is being opened — every tile locks until it resolves. */
  disabled: boolean;
  onSelect: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      // aria-busy rather than a spinner alone: a screen-reader user gets told
      // the control is working, without the label changing under them.
      aria-busy={isOpening}
      style={style}
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 text-left shadow-card",
        "animate-fade-up transition duration-200",
        "hover:-translate-y-0.5 hover:border-platform/40 hover:shadow-card-hover",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
        // The tile being opened stays at full strength; its siblings recede,
        // so the page shows WHICH lab is opening rather than just "something
        // is happening".
        disabled && !isOpening && "pointer-events-none opacity-50",
        isOpening && "border-platform/50 ring-1 ring-platform/30",
        "disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-card",
      )}
    >
      <span
        aria-hidden="true"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-platform-50 text-base font-bold tabular-nums text-platform-700 ring-1 ring-inset ring-platform-100"
      >
        {labMonogram(lab.name)}
      </span>

      {/* min-w-0 is what lets `truncate` work inside a flex row — without it
          the text refuses to shrink and a long lab name blows the tile out. */}
      <span className="min-w-0 flex-1">
        {/* title= so a truncated name is still readable on hover. */}
        <span
          title={lab.name}
          className="block truncate font-semibold text-[var(--text-strong)]"
        >
          {lab.name}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
          {isOpening ? "Opening…" : "Enter lab"}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-platform"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M7.5 4.5L13 10l-5.5 5.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
