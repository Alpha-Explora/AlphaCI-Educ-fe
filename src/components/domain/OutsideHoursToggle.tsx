"use client";
// ============================================================================
// VIEW LAYER — the per-section "outside class hours" switch, as a table cell.
//
// Turning this on suspends the section's timetable, so students can work on its
// projects at any hour — take-home labs, self-paced practice, a catch-up week.
//
// SIZED FOR A ROW, NOT A CARD. The explanation of what the switch does, and the
// warning that ending a class turns it off, are stated ONCE in the table's
// footnote rather than repeated in every row — thirty copies of the same
// paragraph is how a table stops being scannable. What stays here is only what
// differs per section: the switch, the code to hand out, and any error.
//
// Each instance owns its own useClassAccess for one section. That is one query
// per row, which is fine at a teacher's handful of sections and is what lets a
// row show its own live code without the page threading state down.
// ============================================================================
import { useClassAccess } from "@/viewmodels/useClassAccess";
import { CopyButton, Spinner, cn } from "@/components/ui";

export function OutsideHoursToggle({
  classId,
  sectionLabel,
}: {
  readonly classId: string;
  readonly sectionLabel: string;
}) {
  const access = useClassAccess(classId);

  if (access.isLoading) {
    return <Spinner size="sm" />;
  }

  const on = access.outsideHoursAllowed;

  return (
    <div className="space-y-1.5">
      <Switch
        on={on}
        busy={access.isSettingOutsideHours}
        label={`Allow work outside class hours for ${sectionLabel}`}
        onChange={(next) => access.setOutsideHours(next)}
      />

      {/* The code appears beside the switch that needed it. A teacher who has
          just enabled homework needs the thing to hand out, and sending them to
          another page for it is the step that gets forgotten. */}
      {on && access.code && (
        <div className="flex items-center gap-1.5">
          <code className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-xs font-bold tracking-wider text-amber-900 ring-1 ring-amber-200">
            {access.code}
          </code>
          <CopyButton value={access.code} label="Copy" variant="ghost" />
        </div>
      )}

      {on && !access.code && (
        <p className="text-xs text-warning">No code — start the class on Home.</p>
      )}

      {access.actionError && (
        <p className="text-xs text-danger">{access.actionError.message}</p>
      )}
    </div>
  );
}

/**
 * A switch, built on a real <button role="switch"> rather than a styled checkbox.
 *
 * `aria-checked` plus an accessible name is what makes it announce as "switch,
 * on/off" — a div with a click handler announces as nothing, and this control
 * changes who may do work, so it is not one a screen-reader user may skip. The
 * name includes the SECTION because in a table there are many of these and
 * "switch, on" alone would not say which row it belongs to.
 */
function Switch({
  on,
  busy,
  label,
  onChange,
}: {
  readonly on: boolean;
  readonly busy: boolean;
  readonly label: string;
  readonly onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
        "disabled:cursor-not-allowed disabled:opacity-60",
        on ? "bg-success" : "bg-slate-300",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
