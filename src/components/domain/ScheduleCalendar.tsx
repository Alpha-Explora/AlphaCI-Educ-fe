"use client";
// ============================================================================
// VIEW LAYER — the teacher's week, as a timetable.
//
// A WEEK, NOT A MONTH. The month grid this replaced showed thirty days of a
// pattern that repeats every seven, so five sixths of it was the same
// information again — and each cell was too small to say when a class actually
// ran. A week has room to place a class at its real hour and give it its real
// height, which is what makes a clash or a free afternoon visible at a glance.
//
// WHAT IS BEING DRAWN
//
// A section carries a LIST of weekly windows, each a recurrence (`days: [1,3,5]`)
// with one time range applied to every day it names. So a section is not one
// block on this grid — it is one block per (window, day) pair, and two windows
// mean a section can sit at 8am on Monday and 1pm on Wednesday. Everything below
// draws MEETINGS, flattened from that pair, rather than sections.
//
// PHILIPPINE TIME THROUGHOUT. The dates across the top come from Manila's
// calendar, not the viewer's — a teacher on a laptop set to UTC must not see
// their Monday 8am class land on Sunday. Every date is built from UTC fields
// shifted by +8, the same arithmetic as models/schedule.ts.
// ============================================================================
import { useMemo, useState } from "react";
import Link from "next/link";
import { DAY_SHORT, formatTime12, isEnforceable, scheduleBlocks } from "@/models/schedule";
import type { ScheduleRow } from "@/viewmodels/useTeacherSchedule";
import type { ClassSchedule } from "@/models/types";
import { Button, cn } from "@/components/ui";

/** Manila is UTC+8, always — see the header. */
const MANILA_OFFSET_MS = 8 * 60 * 60_000;

/**
 * The window the grid draws, in hours.
 *
 * 6am–10pm rather than a full 24: a school day fits inside it, and the eight
 * empty hours either side would halve the height of every class block to show
 * nothing. A section outside these hours is still listed — see `offGrid` — so
 * the crop never hides a class, it only declines to draw it.
 */
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const HOUR_PX = 44;

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

/** Course colours, keyed on the CODE so two sections of one course match. */
const TONES = [
  "bg-platform-100 text-platform-900 border-platform-300",
  "bg-emerald-100 text-emerald-900 border-emerald-300",
  "bg-amber-100 text-amber-900 border-amber-300",
  "bg-violet-100 text-violet-900 border-violet-300",
  "bg-rose-100 text-rose-900 border-rose-300",
  "bg-sky-100 text-sky-900 border-sky-300",
];

function toneFor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Today in Manila, as a UTC-shifted date we can do calendar maths on. */
function manilaNow(): Date {
  return new Date(Date.now() + MANILA_OFFSET_MS);
}

export function ScheduleCalendar({ rows }: { readonly rows: ScheduleRow[] }) {
  // Offset in weeks from the current one. Kept as a number rather than a date so
  // "this week" is always exactly zero and the Today button has nothing to
  // compute.
  const [weekOffset, setWeekOffset] = useState(0);

  const { days, label } = useMemo(() => {
    const today = manilaNow();
    // Back up to Sunday, then move by whole weeks.
    const sunday = new Date(today);
    sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay() + weekOffset * 7);

    const built = WEEKDAYS.map((i) => {
      const d = new Date(sunday);
      d.setUTCDate(sunday.getUTCDate() + i);
      return {
        weekday: d.getUTCDay(),
        date: d.getUTCDate(),
        month: d.getUTCMonth(),
        isToday:
          weekOffset === 0 &&
          d.getUTCDate() === today.getUTCDate() &&
          d.getUTCMonth() === today.getUTCMonth(),
      };
    });

    const first = built[0];
    const last = built[6];
    const fmt = (m: number) =>
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m];
    const range =
      first.month === last.month
        ? `${fmt(first.month)} ${first.date}–${last.date}`
        : `${fmt(first.month)} ${first.date} – ${fmt(last.month)} ${last.date}`;

    return { days: built, label: range };
  }, [weekOffset]);

  const scheduled = rows.filter((r) => isEnforceable(r.classInfo.schedule));
  const unscheduled = rows.filter((r) => !isEnforceable(r.classInfo.schedule));

  /*
    A section whose hours fall outside the drawn window. Listed rather than
    clipped — cropping the grid must never be the reason a class disappears.

    EVERY window must be off-grid for the section to count, not just one: a
    section meeting 5am and 1pm is drawn, and listing it here as well would tell
    a teacher it is missing from a grid it is visibly on.
  */
  const offGrid = scheduled.filter((r) =>
    scheduleBlocks(r.classInfo.schedule).every(
      (b) =>
        minutesOf(b.endTime) <= DAY_START_HOUR * 60 ||
        minutesOf(b.startTime) >= DAY_END_HOUR * 60,
    ),
  );

  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-strong)]">{label}</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            ←
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            This week
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            →
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-white shadow-card">
        <div className="min-w-[820px]">
          {/* Day header. The left gutter matches the hour-label column below so
              the columns line up without a shared grid definition. */}
          <div className="flex border-b border-[var(--border-subtle)] bg-slate-50/70">
            <div className="w-16 shrink-0" />
            {days.map((d) => (
              <div key={d.weekday} className="flex-1 px-2 py-2 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  {DAY_SHORT[d.weekday]}
                </p>
                <p
                  className={cn(
                    "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums",
                    d.isToday
                      ? "bg-platform-600 font-semibold text-white"
                      : "text-[var(--text-strong)]",
                  )}
                >
                  {d.date}
                </p>
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Hour gutter */}
            <div className="w-16 shrink-0">
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_PX }}
                  className="relative border-b border-[var(--border-subtle)]"
                >
                  <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-[var(--text-muted)]">
                    {formatTime12(`${String(h).padStart(2, "0")}:00`)}
                  </span>
                </div>
              ))}
            </div>

            {days.map((d) => (
              <DayColumn
                key={d.weekday}
                weekday={d.weekday}
                rows={scheduled}
                hours={hours}
              />
            ))}
          </div>
        </div>
      </div>

      {(unscheduled.length > 0 || offGrid.length > 0) && (
        <div className="space-y-1 text-xs text-[var(--text-muted)]">
          {unscheduled.length > 0 && (
            <p>
              <span className="font-medium text-[var(--text-strong)]">No hours set:</span>{" "}
              {unscheduled.map((r) => r.sectionLabel).join(", ")} — ask your IT admin to
              add them to the timetable.
            </p>
          )}
          {offGrid.length > 0 && (
            <p>
              <span className="font-medium text-[var(--text-strong)]">Outside 6am–10pm:</span>{" "}
              {offGrid.map((r) => `${r.sectionLabel} (${r.window})`).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DayColumn({
  weekday,
  rows,
  hours,
}: {
  readonly weekday: number;
  readonly rows: ScheduleRow[];
  readonly hours: number[];
}) {
  /*
    Flattened to MEETINGS: one entry per (section, window) that names this day.
    Filtering sections and then reading `schedule[0]` would draw a section's
    Monday window on Wednesday, at Monday's hour.
  */
  const todays = rows.flatMap((row) =>
    scheduleBlocks(row.classInfo.schedule)
      .filter((block) => block.days.includes(weekday))
      .map((block) => ({ row, block })),
  );

  return (
    <div className="relative flex-1 border-l border-[var(--border-subtle)]">
      {hours.map((h) => (
        <div key={h} style={{ height: HOUR_PX }} className="border-b border-[var(--border-subtle)]" />
      ))}

      {todays.map(({ row, block }) => {
        const startMin = minutesOf(block.startTime);
        const endMin = minutesOf(block.endTime);
        // Clamped to the drawn window so a class starting at 5am still shows its
        // visible portion rather than being pushed above the grid.
        const top = ((Math.max(startMin, DAY_START_HOUR * 60) - DAY_START_HOUR * 60) / 60) * HOUR_PX;
        const height =
          ((Math.min(endMin, DAY_END_HOUR * 60) - Math.max(startMin, DAY_START_HOUR * 60)) / 60) *
          HOUR_PX;
        if (height <= 0) return null;

        return (
          <Link
            key={`${row.classInfo.id}-${block.startTime}`}
            href={`/teacher/classes/${row.classInfo.id}`}
            title={`${row.sectionLabel} — ${row.courseLabel} · ${row.window}`}
            style={{ top, height: Math.max(height, 22) }}
            className={cn(
              "absolute inset-x-1 overflow-hidden rounded border px-1.5 py-0.5 text-[11px] leading-tight transition-opacity hover:opacity-85",
              toneFor(row.classInfo.code),
            )}
          >
            <span className="block truncate font-semibold">{row.sectionLabel}</span>
            <span className="block truncate tabular-nums opacity-80">
              {formatTime12(block.startTime)}–{formatTime12(block.endTime)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
