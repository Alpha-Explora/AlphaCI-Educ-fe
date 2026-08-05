"use client";
// ============================================================================
// VIEW LAYER — the per-section "outside class hours" switch.
//
// Turning this on suspends the section's timetable, so students can work on its
// projects at any hour — take-home labs, self-paced practice, a catch-up week.
//
// TWO THINGS THE COPY HAS TO CARRY, because both surprise teachers otherwise:
//
//   1. It does NOT remove the class code. A student at home still types one, so
//      the teacher has to hand it out — which is why switching this on also opens
//      the class, and why the code appears right here rather than only on Home.
//   2. Ending the class turns this back off. "End class" means nobody works on
//      this section now, including at home, and a switch that silently survived
//      it would leave a section open all night.
//
// Each instance owns its own useClassAccess for one section. That is one query
// per row, which is fine at a teacher's handful of sections and is what lets a
// row show its own live code without the page threading state down.
// ============================================================================
import { useClassAccess } from "@/viewmodels/useClassAccess";
import { Banner, CopyButton, Spinner, cn } from "@/components/ui";

export function OutsideHoursToggle({
  classId,
  sectionLabel,
}: {
  readonly classId: string;
  readonly sectionLabel: string;
}) {
  const access = useClassAccess(classId);

  if (access.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Spinner size="sm" /> Loading…
      </div>
    );
  }

  const on = access.outsideHoursAllowed;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-strong)]">
            Work outside class hours
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {on
              ? "Students can work on this section's projects at any time."
              : "Students can only work during the hours above."}
          </p>
        </div>

        <Switch
          on={on}
          busy={access.isSettingOutsideHours}
          label={`Work outside class hours for ${sectionLabel}`}
          onChange={(next) => access.setOutsideHours(next)}
        />
      </div>

      {access.actionError && <Banner tone="error">{access.actionError.message}</Banner>}

      {/* The code lives here too when async is on. A teacher who has just enabled
          homework needs the thing to hand out, and sending them to another page
          for it is the step that gets forgotten. */}
      {on && access.code && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-amber-900">
              Give this code to your students
            </p>
            <p className="font-mono text-lg font-bold tracking-[0.15em] text-amber-900">
              {access.code}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <CopyButton value={access.code} label="Copy" />
          </div>
        </div>
      )}

      {on && !access.code && (
        <Banner tone="warning">
          This section is open outside class hours but has no code, so nobody can get
          in. Start the class from Home to generate one.
        </Banner>
      )}

      {on && (
        <p className="text-xs text-[var(--text-muted)]">
          Ending the class on Home turns this off and signs everyone out.
        </p>
      )}
    </div>
  );
}

/**
 * A switch, built on a real <button role="switch"> rather than a styled checkbox.
 *
 * `aria-checked` plus an accessible name is what makes it announce as "switch,
 * on/off" — a div with a click handler announces as nothing, and this control
 * changes who can do work, so it is not one a screen-reader user may skip.
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
