"use client";
// ============================================================================
// VIEW LAYER — the class's weekly meeting window, on the Settings tab.
//
// PHILIPPINE TIME, SAID OUT LOUD. Every label names it. The times are stored and
// enforced in Asia/Manila regardless of where the teacher's laptop thinks it is,
// and a schedule that silently meant "whatever zone the browser is in" would lock
// a class at the wrong hour for an entire term before anyone worked out why. The
// one thing this card must never be is ambiguous about which clock it means.
//
// It is a GATE and the copy says so. While a window is set, students cannot start
// a lab session, take a token or submit outside it — they can still read the
// brief and their past results, which is why the wording is "can't work on"
// rather than "can't see". A teacher turning this on is changing what a class can
// DO, and the card should not read like a calendar entry.
// ============================================================================
import { Button, Card, GenericPill, Input, cn } from "@/components/ui";
import type { ClassSchedule } from "@/models/types";
import { useClassSchedule, WEEKDAYS } from "@/viewmodels/useClassSchedule";

export function ClassScheduleCard({
  classId,
  schedule,
}: Readonly<{
  classId: string | null;
  /** What is currently stored, or undefined for an unscheduled class. */
  schedule: ClassSchedule | undefined;
}>) {
  const vm = useClassSchedule(classId, schedule);

  return (
    <Card className="p-5 animate-fade-up sm:max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">Class hours</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Set when this section meets. Students can only work on this class&apos;s
            projects during these hours — they can still read the brief and their
            past results at any time.
          </p>
        </div>
        {vm.enabled ? (
          <GenericPill tone="info">Scheduled</GenericPill>
        ) : (
          <GenericPill>Always open</GenericPill>
        )}
      </div>

      {/* The master switch. A plain checkbox rather than a toggle component:
          "off" here means the class has NO schedule and is open around the clock,
          which is a state worth being able to read as words. */}
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={vm.enabled}
          onChange={(e) => vm.setEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-subtle)] text-platform-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
        />
        <span className="text-sm text-[var(--text-strong)]">
          Restrict student work to scheduled hours
          <span className="mt-0.5 block text-xs font-normal text-[var(--text-muted)]">
            Leave this off and the class is available whenever a student opens it.
          </span>
        </span>
      </label>

      {vm.enabled && (
        <div className="mt-5 space-y-5 border-t border-[var(--border-subtle)] pt-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Days
            </p>
            {/* Monday first. Sunday is day 0 in JavaScript and would sort to the
                front of a numeric list, which is not where a timetable puts it. */}
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = vm.days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => vm.toggleDay(d.value)}
                    aria-pressed={on}
                    aria-label={d.label}
                    className={cn(
                      "min-w-[3.25rem] rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
                      on
                        ? "border-platform-300 bg-platform-50 text-platform-700"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-slate-50",
                    )}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Starts
              </span>
              <Input
                type="time"
                value={vm.startTime}
                onChange={(e) => vm.setStartTime(e.target.value)}
                className="mt-1 w-32"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Ends
              </span>
              <Input
                type="time"
                value={vm.endTime}
                onChange={(e) => vm.setEndTime(e.target.value)}
                className="mt-1 w-32"
              />
            </label>
            {/* Named on the controls themselves, not only in the heading. A
                teacher scanning back to check a time should not have to trust
                that they remember which zone the card was about. */}
            <p className="pb-2 text-xs text-[var(--text-muted)]">
              Philippine time (UTC+8)
            </p>
          </div>

          {/* The end time is exclusive, and that is the sort of detail a teacher
              only discovers by having a student complain. Stated up front. */}
          <p className="text-xs text-[var(--text-muted)]">
            The class closes at the end time — a session ending 10:00 stops
            accepting work at 10:00.
          </p>
        </div>
      )}

      {vm.validationError && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {vm.validationError}
        </p>
      )}
      {vm.saveError && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {vm.saveError}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button
          size="sm"
          onClick={vm.save}
          loading={vm.isSaving}
          disabled={!vm.isDirty || Boolean(vm.validationError)}
        >
          Save class hours
        </Button>
        {vm.justSaved && !vm.isDirty && (
          <span className="text-sm text-success" role="status">
            Saved.
          </span>
        )}
      </div>
    </Card>
  );
}
