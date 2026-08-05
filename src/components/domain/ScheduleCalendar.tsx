"use client";
// ============================================================================
// VIEW LAYER — the teacher's month, as a calendar.
//
// WHY A CALENDAR AND NOT THE TABLE IT REPLACED
//
// A table row says "Mon, Wed, Fri · 8am–10am", which is the RULE. A teacher
// asking "what does next Tuesday look like" then has to expand that rule across
// five sections in their head. The grid does the expanding: each cell is a real
// day with the real sections on it, so a clash, a heavy Thursday, or a free
// Friday is visible rather than derived.
//
// WHAT IS BEING EXPANDED
//
// A ClassSchedule is a WEEKLY RECURRENCE (`days: [1,3,5]`), not a list of dated
// events — there is no start or end date on a section, so every matching weekday
// in any month shows the class. That is faithful to the data: the section really
// does meet every Wednesday until the teacher changes its hours.
//
// PHILIPPINE TIME THROUGHOUT. The grid is built from Manila's calendar, not the
// viewer's — a teacher on a laptop set to UTC must not see their Monday 8am
// class land on Sunday. Every date here is constructed from UTC fields shifted
// by +8, the same arithmetic as models/schedule.ts, and never from local getters.
// ============================================================================
import { useMemo, useState } from "react";
import Link from "next/link";
import { DAY_SHORT, formatTime12, isEnforceable } from "@/models/schedule";
import type { ScheduleRow } from "@/viewmodels/useTeacherSchedule";
import { Button, cn } from "@/components/ui";

/** Manila is UTC+8, always — see the header. */
const MANILA_OFFSET_MS = 8 * 60 * 60_000;

/** Sunday-first, matching how a wall calendar is read. */
const WEEKDAY_HEADS = [0, 1, 2, 3, 4, 5, 6];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * A course's colour, stable across renders and months.
 *
 * Keyed on the course CODE rather than the section id, so AT-1234 · A and
 * AT-1234 · B share a colour — a teacher reads the grid by subject first, and
 * two sections of one course looking unrelated is the thing that makes a month
 * view hard to scan.
 */
const CHIP_TONES = [
  "bg-platform-50 text-platform-800 ring-platform-200",
  "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "bg-amber-50 text-amber-900 ring-amber-200",
  "bg-violet-50 text-violet-800 ring-violet-200",
  "bg-rose-50 text-rose-800 ring-rose-200",
  "bg-sky-50 text-sky-800 ring-sky-200",
];

function toneFor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return CHIP_TONES[hash % CHIP_TONES.length];
}

/** Today, as Manila sees it. */
function manilaToday(): { year: number; month: number; day: number } {
  const d = new Date(Date.now() + MANILA_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
}

interface Cell {
  year: number;
  month: number;
  day: number;
  /** Weekday, 0 = Sunday — the value ClassSchedule.days uses. */
  weekday: number;
  inMonth: boolean;
  isToday: boolean;
}

/**
 * Six weeks of cells covering `month`, padded with the neighbouring months.
 *
 * Always six rows, never five-or-six. A grid that changes height as the teacher
 * pages through the year makes the controls jump under the cursor, and the empty
 * final row costs nothing.
 */
function buildGrid(year: number, month: number): Cell[] {
  const today = manilaToday();
  // Date.UTC + getUTCDay keeps this in the shifted calendar rather than the
  // browser's; `new Date(y, m, d)` would read the viewer's timezone.
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();

  const cells: Cell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(Date.UTC(year, month, 1 - firstWeekday + i));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const d = date.getUTCDate();
    cells.push({
      year: y,
      month: m,
      day: d,
      weekday: date.getUTCDay(),
      inMonth: m === month && y === year,
      isToday: y === today.year && m === today.month && d === today.day,
    });
  }
  return cells;
}

export function ScheduleCalendar({ rows }: { readonly rows: ScheduleRow[] }) {
  const today = useMemo(manilaToday, []);
  const [view, setView] = useState({ year: today.year, month: today.month });

  const grid = useMemo(() => buildGrid(view.year, view.month), [view]);

  /*
    Sections bucketed by weekday, once per render rather than per cell. Six weeks
    times five sections is 210 comparisons otherwise, redone on every paint.

    Sections with no hours set are deliberately absent from the grid: they meet at
    no particular time, so placing them on a day would be an invention. They are
    listed under the grid instead.
  */
  const byWeekday = useMemo(() => {
    const map = new Map<number, ScheduleRow[]>();
    for (const row of rows) {
      if (!isEnforceable(row.classInfo.schedule)) continue;
      for (const day of row.classInfo.schedule!.days) {
        map.set(day, [...(map.get(day) ?? []), row]);
      }
    }
    // Earliest class first within a day — the order the day is actually taught.
    for (const [day, list] of map) {
      map.set(
        day,
        [...list].sort((a, b) =>
          (a.classInfo.schedule?.startTime ?? "").localeCompare(
            b.classInfo.schedule?.startTime ?? "",
          ),
        ),
      );
    }
    return map;
  }, [rows]);

  const unscheduled = rows.filter((r) => !isEnforceable(r.classInfo.schedule));

  const shift = (by: number) => {
    const next = new Date(Date.UTC(view.year, view.month + by, 1));
    setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  const isThisMonth = view.year === today.year && view.month === today.month;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-strong)]">
          {MONTHS[view.month]} {view.year}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => shift(-1)} aria-label="Previous month">
            ←
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setView({ year: today.year, month: today.month })}
            disabled={isThisMonth}
          >
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => shift(1)} aria-label="Next month">
            →
          </Button>
        </div>
      </div>

      {/* The grid scrolls sideways rather than squeezing seven columns into a
          phone: a 40px cell cannot hold "7:30pm AT-1234 · A" legibly. */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-white shadow-card">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-7 border-b border-[var(--border-subtle)] bg-slate-50/70">
            {WEEKDAY_HEADS.map((d) => (
              <div
                key={d}
                className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]"
              >
                {DAY_SHORT[d]}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {grid.map((cell) => (
              <DayCell
                key={`${cell.year}-${cell.month}-${cell.day}`}
                cell={cell}
                rows={byWeekday.get(cell.weekday) ?? []}
              />
            ))}
          </div>
        </div>
      </div>

      {unscheduled.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-strong)]">Not on the calendar:</span>{" "}
          {unscheduled.map((r) => r.sectionLabel).join(", ")} — no class hours set, so
          {unscheduled.length === 1 ? " it meets" : " they meet"} at no particular time.
        </p>
      )}
    </div>
  );
}

function DayCell({ cell, rows }: { readonly cell: Cell; readonly rows: ScheduleRow[] }) {
  return (
    <div
      className={cn(
        "min-h-[7rem] border-b border-r border-[var(--border-subtle)] p-2",
        // Padding days are dimmed rather than blank: a teacher looking at the
        // start of the month still needs to see that Monday the 30th has a class.
        !cell.inMonth && "bg-slate-50/40",
      )}
    >
      <div className="mb-1 flex justify-end">
        <span
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs tabular-nums",
            cell.isToday && "bg-platform-600 font-semibold text-white",
            !cell.isToday && cell.inMonth && "text-[var(--text-strong)]",
            !cell.isToday && !cell.inMonth && "text-[var(--text-muted)]",
          )}
        >
          {cell.day}
        </span>
      </div>

      <div className="space-y-1">
        {rows.map((row) => (
          <Link
            key={row.classInfo.id}
            href={`/teacher/classes/${row.classInfo.id}`}
            title={`${row.sectionLabel} — ${row.courseLabel}`}
            className={cn(
              "block truncate rounded px-1.5 py-1 text-xs ring-1 ring-inset transition-opacity hover:opacity-80",
              toneFor(row.classInfo.code),
              !cell.inMonth && "opacity-60",
            )}
          >
            <span className="font-medium tabular-nums">
              {formatTime12(row.classInfo.schedule!.startTime)}
            </span>{" "}
            {row.sectionLabel}
          </Link>
        ))}
      </div>
    </div>
  );
}
