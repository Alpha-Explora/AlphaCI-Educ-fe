"use client";
// ============================================================================
// VIEW LAYER — "Class access", the teacher's control for starting a class.
//
// Sits at the top of the teacher dashboard because it is the first thing done in
// a laboratory and the last thing undone: no student can reach their work until
// this code is on the screen.
//
// IT SHOWS THE UPCOMING CLASS, AND ONLY THAT. `classMeetingNow` reads the
// timetable and picks whichever section is meeting now (or opening soonest), so
// Home answers one question — "start the class I am about to teach" — in one
// button.
//
// There is deliberately no section picker here any more. A dropdown asked the
// teacher something their own timetable already answers, at the worst possible
// moment, standing in front of a full room. Any OTHER section is opened from its
// own Settings tab (see ClassAccessPanel), which is where a make-up class or a
// room swap is dealt with — and where the section being acted on is the page you
// are standing on rather than a choice in a list.
//
// Loud when open, quiet when closed — it is read off a projector by people at the
// back of the room, but a teacher glancing at the dashboard between classes
// should not be shouted at. Data lives in useClassAccess; this is layout and copy.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useClassAccess } from "@/viewmodels/useClassAccess";
import type { TeacherClass } from "@/viewmodels/useTeacherCourseBoard";
import {
  classMeetingNow,
  describeSchedule,
  humaniseMinutes,
  isEnforceable,
  isInSession,
  minutesUntilClose,
  minutesUntilOpen,
  nextMeetingDay,
} from "@/models/schedule";
import { Banner, Button, GenericPill, Spinner, cn } from "@/components/ui";
import { JoinCodeDisplay } from "./JoinCodeDisplay";

export function ClassAccessCard({ classes }: { readonly classes: TeacherClass[] }) {
  /*
    Re-detect every minute. The teacher's dashboard is left open across period
    boundaries far more often than it is reloaded — that IS the usage pattern —
    so without a tick the card would still be offering the 08:00 section at 10:05.
    A minute is finer than any schedule boundary and costs nothing.
  */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const selected = useMemo(() => classMeetingNow(classes, now), [classes, now]);
  const access = useClassAccess(selected?.id ?? null);

  if (classes.length === 0) return null;

  const schedule = selected?.schedule;
  const inSession = isInSession(schedule, now);
  const scheduled = isEnforceable(schedule);

  return (
    <section
      className={cn(
        "animate-fade-up overflow-hidden rounded-xl border bg-white shadow-card",
        /*
          Emerald palette, NOT `success/40`. The `success` token is a hex CSS
          variable (`--status-success: #0f9d58`) mapped without an `<alpha-value>`
          slot, so Tailwind cannot compose an alpha into it and every `/opacity`
          variant on it silently compiles to NOTHING. Only `platform` survives
          that, because it stores raw channels. This matches GenericPill's own
          success tone, which is why the pill and this rail agree.
        */
        access.isOpen
          ? "border-emerald-300 ring-1 ring-emerald-100"
          : "border-[var(--border-subtle)]",
      )}
      aria-labelledby="class-access-heading"
    >
      <StatusRail
        isOpen={access.isOpen}
        outsideHours={access.outsideHoursAllowed}
        section={selected}
        schedule={schedule}
        scheduled={scheduled}
        inSession={inSession}
        now={now}
      />

      <div className="space-y-4 px-5 py-5">
        {access.error && (
          <Banner tone="error" title="Could not load the class code">
            {access.error.message}
          </Banner>
        )}
        {access.actionError && <Banner tone="error">{access.actionError.message}</Banner>}

        {access.isLoading && (
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <Spinner size="sm" /> Checking whether this class is open…
          </div>
        )}

        {!access.isLoading && !access.isOpen && (
          <ClosedState
            sectionLabel={selected ? labelFor(selected) : "this section"}
            scheduled={scheduled}
            inSession={inSession}
            schedule={schedule}
            now={now}
            onStart={access.open}
            isStarting={access.isOpening}
          />
        )}

        {!access.isLoading && access.isOpen && access.code && (
          <OpenState
            code={access.code}
            admittedCount={access.admittedCount}
            outsideHours={access.outsideHoursAllowed}
            onRotate={access.rotate}
            isRotating={access.isRotating}
            onEnd={access.end}
            isEnding={access.isEnding}
          />
        )}
      </div>
    </section>
  );
}

/** "CS-101 · A" — how a teacher refers to one of their sections out loud. */
function labelFor(c: TeacherClass): string {
  return `${c.code} · ${c.section}`;
}

function StatusRail({
  isOpen,
  outsideHours,
  section,
  schedule,
  scheduled,
  inSession,
  now,
}: {
  readonly isOpen: boolean;
  readonly outsideHours: boolean;
  readonly section: TeacherClass | null;
  readonly schedule: TeacherClass["schedule"];
  readonly scheduled: boolean;
  readonly inSession: boolean;
  readonly now: Date;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
        // Emerald, not `success/10` — see the note on the section border above.
        isOpen ? "bg-emerald-50" : "bg-slate-50",
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "inline-block h-2.5 w-2.5 rounded-full",
            isOpen ? "animate-pulse bg-success" : "bg-slate-300",
          )}
        />
        <h2 id="class-access-heading" className="text-sm font-semibold text-[var(--text-strong)]">
          Class access
        </h2>

        {section && (
          <span className="text-sm font-medium text-[var(--text-strong)]">
            {labelFor(section)}
          </span>
        )}

        {/* Why THIS section — so the teacher can tell at a glance whether the
            guess is right, instead of having to open the picker to check. */}
        {scheduled && inSession && (
          <GenericPill tone="success">Now · {describeSchedule(schedule)}</GenericPill>
        )}
        {scheduled && !inSession && <NextUpPill schedule={schedule} now={now} />}
        {!scheduled && <GenericPill tone="neutral">No schedule set</GenericPill>}

        {outsideHours && <GenericPill tone="warning">Outside hours open</GenericPill>}
      </div>

    </div>
  );
}

function NextUpPill({
  schedule,
  now,
}: {
  readonly schedule: TeacherClass["schedule"];
  readonly now: Date;
}) {
  const mins = minutesUntilOpen(schedule, now);
  if (mins === null) return null;
  const day = nextMeetingDay(schedule, now);
  // Under an hour reads as urgency ("in 25 min"); further out, the weekday is
  // the useful part, because "in 3 days" does not tell a teacher which day.
  const when = mins < 60 ? `in ${humaniseMinutes(mins)}` : `${day} ${schedule?.startTime}`;
  return <GenericPill tone="neutral">Next · {when}</GenericPill>;
}

function ClosedState({
  sectionLabel,
  scheduled,
  inSession,
  schedule,
  now,
  onStart,
  isStarting,
}: {
  readonly sectionLabel: string;
  readonly scheduled: boolean;
  readonly inSession: boolean;
  readonly schedule: TeacherClass["schedule"];
  readonly now: Date;
  readonly onStart: () => void;
  readonly isStarting: boolean;
}) {
  const closesIn = minutesUntilClose(schedule, now);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-xl space-y-1">
        <p className="text-sm text-[var(--text-muted)]">
          Students can sign in, but cannot open their dashboard until you start the
          class and they type the code.
        </p>
        {scheduled && inSession && closesIn !== null && (
          <p className="text-sm font-medium text-success">
            {sectionLabel} is meeting now — {humaniseMinutes(closesIn)} left.
          </p>
        )}
        {scheduled && !inSession && (
          <p className="text-sm text-[var(--text-muted)]">
            {sectionLabel} is outside its class hours. Starting it now is fine —
            the timetable does not stop you.
          </p>
        )}
      </div>

      <Button onClick={onStart} loading={isStarting}>
        Start {sectionLabel}
      </Button>
    </div>
  );
}

function OpenState({
  code,
  admittedCount,
  outsideHours,
  onRotate,
  isRotating,
  onEnd,
  isEnding,
}: {
  readonly code: string;
  readonly admittedCount: number;
  readonly outsideHours: boolean;
  readonly onRotate: () => void;
  readonly isRotating: boolean;
  readonly onEnd: () => void;
  readonly isEnding: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Show this code to your class. Each student types it once, after signing in.
      </p>

      <JoinCodeDisplay code={code} label="Class access code" />

      {outsideHours && (
        <Banner tone="info" title="Outside class hours is on">
          Hand this code to your students so they can work on this section&apos;s
          projects at home. It keeps working until you end the class.
        </Banner>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-strong)]">{admittedCount}</span>{" "}
          {admittedCount === 1 ? "student has" : "students have"} joined
        </p>

        <div className="flex flex-wrap gap-2">
          {/* Rotate before End, and visually quieter: it is the recoverable one. */}
          <Button variant="secondary" size="sm" onClick={onRotate} loading={isRotating}>
            New code
          </Button>
          <Button variant="danger" size="sm" onClick={onEnd} loading={isEnding}>
            End class
          </Button>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        <span className="font-medium">New code</span> stops the current one working
        without disturbing students who have already joined — use it if the code has
        spread outside the room. <span className="font-medium">End class</span> signs
        everyone out
        {outsideHours ? " and turns off outside-hours access." : "."}
      </p>
    </div>
  );
}
