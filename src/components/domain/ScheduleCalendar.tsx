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
import { useSession } from "@/viewmodels/useSession";

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

/**
 * The same grid at two sizes, from ONE component.
 *
 * Home embeds this beside its other cards, where the full 44px hour is taller
 * than the column it sits in. `compact` shrinks the row height, the gutter and
 * the type — it does NOT drop anything: the same meetings, the same week nav,
 * the same off-grid and no-hours notes. A second "mini calendar" component would
 * have been the obvious move and the wrong one; the two would agree on the day
 * this was written and diverge on the first change to either.
 *
 * Every class below is written as a whole literal on both sides of the ternary.
 * Tailwind scans this file as text and never evaluates it, so `w-${n}` compiles
 * to nothing — see the note in AppShell for the same trap.
 */
const COMPACT_HOUR_PX = 28;

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

export function ScheduleCalendar({
  rows,
  compact = false,
}: {
  readonly rows: ScheduleRow[];
  /** Shrink to fit Home's column. Same contents — see COMPACT_HOUR_PX. */
  readonly compact?: boolean;
}) {
  const hourPx = compact ? COMPACT_HOUR_PX : HOUR_PX;
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

  const { labs } = useSession();
  const labName = useMemo(() => {
    const byId = new Map(labs.map((l) => [l.id, l.name]));
    // Built once and passed down, rather than looked up inside each block: the
    // grid draws up to seven columns of them and DayColumn is on the hot path.
    return (id: string | undefined) => (id ? byId.get(id) : undefined);
  }, [labs]);

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
        <h2
          className={
            compact
              ? "text-sm font-semibold text-[var(--text-strong)]"
              : "text-lg font-semibold text-[var(--text-strong)]"
          }
        >
          {label}
        </h2>
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
        <div className={compact ? "min-w-[520px]" : "min-w-[820px]"}>
          {/* Day header. The left gutter matches the hour-label column below so
              the columns line up without a shared grid definition — change one
              and the other has to move with it, at BOTH sizes. */}
          <div className="flex border-b border-[var(--border-subtle)] bg-slate-50/70">
            <div className={compact ? "w-10 shrink-0" : "w-16 shrink-0"} />
            {days.map((d) => (
              <div
                key={d.weekday}
                className={compact ? "flex-1 px-1 py-1 text-center" : "flex-1 px-2 py-2 text-center"}
              >
                <p
                  className={
                    compact
                      ? "text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]"
                      : "text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]"
                  }
                >
                  {DAY_SHORT[d.weekday]}
                </p>
                <p
                  className={cn(
                    "mx-auto flex items-center justify-center rounded-full tabular-nums",
                    compact ? "mt-0.5 h-5 w-5 text-[11px]" : "mt-1 h-7 w-7 text-sm",
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
            <div className={compact ? "w-10 shrink-0" : "w-16 shrink-0"}>
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ height: hourPx }}
                  className="relative border-b border-[var(--border-subtle)]"
                >
                  <span
                    className={
                      compact
                        ? "absolute -top-1.5 right-1 text-[9px] tabular-nums text-[var(--text-muted)]"
                        : "absolute -top-2 right-2 text-[11px] tabular-nums text-[var(--text-muted)]"
                    }
                  >
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
                hourPx={hourPx}
                compact={compact}
                labName={labName}
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
  hourPx,
  compact,
  labName,
}: {
  readonly weekday: number;
  readonly rows: ScheduleRow[];
  readonly hours: number[];
  /** Row height in px — the ONE number the two sizes actually differ by. */
  readonly hourPx: number;
  readonly compact: boolean;
  /** Names a room id, so a block can say WHERE as well as when. */
  readonly labName: (id: string | undefined) => string | undefined;
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
        <div key={h} style={{ height: hourPx }} className="border-b border-[var(--border-subtle)]" />
      ))}

      {todays.map(({ row, block }) => {
        const startMin = minutesOf(block.startTime);
        const endMin = minutesOf(block.endTime);
        // Clamped to the drawn window so a class starting at 5am still shows its
        // visible portion rather than being pushed above the grid.
        const top = ((Math.max(startMin, DAY_START_HOUR * 60) - DAY_START_HOUR * 60) / 60) * hourPx;
        const height =
          ((Math.min(endMin, DAY_END_HOUR * 60) - Math.max(startMin, DAY_START_HOUR * 60)) / 60) *
          hourPx;
        if (height <= 0) return null;

        return (
          <Link
            key={`${row.classInfo.id}-${block.startTime}`}
            href={`/teacher/classes/${row.classInfo.id}`}
            title={[
              `${row.sectionLabel} — ${row.courseLabel} · ${row.window}`,
              labName(block.labOrgId),
            ]
              .filter(Boolean)
              .join(" · ")}
            style={{ top, height: Math.max(height, compact ? 16 : 22) }}
            className={cn(
              "absolute inset-x-1 overflow-hidden rounded border leading-tight transition-opacity hover:opacity-85",
              compact ? "px-1 py-0 text-[9px]" : "px-1.5 py-0.5 text-[11px]",
              toneFor(row.classInfo.code),
            )}
          >
            <span className="block truncate font-semibold">{row.sectionLabel}</span>
            <span className="block truncate tabular-nums opacity-80">
              {formatTime12(block.startTime)}–{formatTime12(block.endTime)}
            </span>
            {/*
              The room, when the block is tall enough to hold a third line. A
              section can meet in a different laboratory on a different day, so
              the hour alone no longer says where to go.

              The threshold is in PIXELS and the row height changed, so it has to
              be measured against the size actually being drawn — a fixed 44 would
              have hidden the room on every compact block taller than one hour.
            */}
            {height >= (compact ? 34 : 44) && labName(block.labOrgId) && (
              <span
                className={
                  compact ? "block truncate text-[8px] opacity-70" : "block truncate text-[10px] opacity-70"
                }
              >
                {labName(block.labOrgId)}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
