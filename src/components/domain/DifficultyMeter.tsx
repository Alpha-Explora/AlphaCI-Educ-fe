"use client";
// ============================================================================
// VIEW LAYER — the 1-5 difficulty meter, read-only and as a picker.
//
// Extracted so the two halves of one comparison cannot drift. A teacher writing
// their own project sets this number, and the picker then shows it beside the
// built-in catalogue's — five pips against five pips. If the editor rendered a
// select and the gallery rendered pips, "harder than Calculator" would be a
// judgement the teacher could only make by translating between two scales.
// ============================================================================
import { cn } from "@/components/ui";

const PIPS = [1, 2, 3, 4, 5] as const;

/** Read-only meter — used wherever a chosen project is described. */
export function DifficultyMeter({ level }: { readonly level: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Difficulty ${level} of 5`}>
      <span className="sr-only">Difficulty {level} of 5</span>
      {PIPS.map((pip) => (
        <span
          key={pip}
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            pip <= level ? "bg-platform" : "bg-slate-200",
          )}
        />
      ))}
    </span>
  );
}

/**
 * The same meter, set by the teacher.
 *
 * Radios rather than a select or a slider. A select hides the scale until it is
 * opened, and this value's whole meaning is its position on a scale; a slider
 * has no discrete stops a keyboard user can name. Radios give five labelled
 * targets, arrow-key movement for free, and — because the pips are the label —
 * the control looks like the thing it is setting.
 */
export function DifficultyPicker({
  value,
  onChange,
  name,
}: {
  readonly value: number;
  readonly onChange: (level: 1 | 2 | 3 | 4 | 5) => void;
  /** Groups the radios. Must be unique on the page. */
  readonly name: string;
}) {
  return (
    <div role="radiogroup" aria-label="Difficulty" className="flex flex-wrap gap-1.5">
      {PIPS.map((pip) => {
        const selected = pip === value;
        return (
          <label
            key={pip}
            className={cn(
              "cursor-pointer rounded-lg border px-3 py-2 transition-colors",
              selected
                ? "border-platform bg-platform-50"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-slate-50",
            )}
          >
            <input
              type="radio"
              name={name}
              value={pip}
              checked={selected}
              onChange={() => onChange(pip)}
              className="sr-only"
            />
            {/* The pips ARE the label, so the number is only for screen readers
                and for anyone who cannot tell the filled pips apart. */}
            <span className="sr-only">Difficulty {pip} of 5</span>
            <span aria-hidden="true" className="flex items-center gap-1">
              {PIPS.map((dot) => (
                <span
                  key={dot}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    dot <= pip
                      ? selected
                        ? "bg-platform"
                        : "bg-slate-400"
                      : "bg-slate-200",
                  )}
                />
              ))}
            </span>
          </label>
        );
      })}
    </div>
  );
}
