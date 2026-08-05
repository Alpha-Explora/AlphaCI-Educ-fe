"use client";
// ============================================================================
// VIEW LAYER — "Class access code", the teacher's control for starting a class.
//
// Sits at the top of the teacher dashboard because it is the first thing done in
// a laboratory and the last thing undone: no student can reach their work until
// this code is on the screen, so burying it under the course cards would put a
// blocker for the whole room behind a scroll.
//
// The card is deliberately loud when the class is OPEN — an oversized code and a
// green rail — because it is being read off a projector by people at the back of
// the room. It is deliberately quiet when closed, so a teacher glancing at their
// dashboard between classes is not being shouted at.
//
// Data and derivation live in useClassAccess; this file is layout and copy.
// ============================================================================
import { useEffect, useState } from "react";
import { useClassAccess } from "@/viewmodels/useClassAccess";
import type { TeacherClass } from "@/viewmodels/useTeacherCourseBoard";
import { Banner, Button, Select, Spinner, cn } from "@/components/ui";
import { JoinCodeDisplay } from "./JoinCodeDisplay";

export function ClassAccessCard({ classes }: { readonly classes: TeacherClass[] }) {
  /*
    Which section this teacher is about to run. Held here rather than in the
    ViewModel because it is pure screen state — nothing on the server has an
    opinion about which of a teacher's sections they are looking at.
  */
  const [classId, setClassId] = useState<string | null>(null);

  /*
    Default to the first section once they load, and recover if it disappears
    (a section deleted in another tab, or a lab switch that swapped the whole
    list). Without the second half the card would sit on a dead id and show a
    permanent error instead of falling back to a section that does exist.
  */
  useEffect(() => {
    const stillThere = classId && classes.some((c) => c.id === classId);
    if (!stillThere) setClassId(classes[0]?.id ?? null);
  }, [classes, classId]);

  const access = useClassAccess(classId);
  const selected = classes.find((c) => c.id === classId) ?? null;

  // Nothing to open. A teacher with no sections gets no card at all rather than
  // an empty control — the dashboard's own empty state already explains why.
  if (classes.length === 0) return null;

  return (
    <section
      className={cn(
        "animate-fade-up overflow-hidden rounded-xl border bg-white shadow-card",
        access.isOpen
          ? "border-success/40 ring-1 ring-success/20"
          : "border-[var(--border-subtle)]",
      )}
      aria-labelledby="class-access-heading"
    >
      {/* Status rail — the one element readable from across the room. */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
          access.isOpen ? "bg-success/10" : "bg-slate-50",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full",
              access.isOpen ? "animate-pulse bg-success" : "bg-slate-300",
            )}
          />
          <h2
            id="class-access-heading"
            className="text-sm font-semibold text-[var(--text-strong)]"
          >
            Class access code
          </h2>
          <span className="text-sm text-[var(--text-muted)]">
            {access.isOpen ? "Class is open" : "Class is closed"}
          </span>
        </div>

        {/* Section picker. Hidden for a teacher with exactly one section — a
            select with a single option is a control that cannot be used. */}
        {classes.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span>Section</span>
            <Select
              value={classId ?? ""}
              onChange={(e) => setClassId(e.target.value)}
              className="w-auto min-w-[12rem]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.section} — {c.name}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      <div className="space-y-4 px-5 py-5">
        {access.error && (
          <Banner tone="error" title="Could not load the class code">
            {access.error.message}
          </Banner>
        )}
        {access.actionError && (
          <Banner tone="error">{access.actionError.message}</Banner>
        )}

        {access.isLoading && (
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <Spinner size="sm" /> Checking whether this class is open…
          </div>
        )}

        {!access.isLoading && !access.isOpen && (
          <ClosedState
            className={selected?.name ?? "this section"}
            onStart={access.open}
            isStarting={access.isOpening}
          />
        )}

        {!access.isLoading && access.isOpen && access.code && (
          <OpenState
            code={access.code}
            admittedCount={access.admittedCount}
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

function ClosedState({
  className,
  onStart,
  isStarting,
}: {
  readonly className: string;
  readonly onStart: () => void;
  readonly isStarting: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-xl text-sm text-[var(--text-muted)]">
        Your students can sign in, but they cannot open their dashboard until you
        start the class and they type the code you show them. Start{" "}
        <span className="font-medium text-[var(--text-strong)]">{className}</span>{" "}
        when everyone is seated.
      </p>
      <Button onClick={onStart} loading={isStarting}>
        Start class
      </Button>
    </div>
  );
}

function OpenState({
  code,
  admittedCount,
  onRotate,
  isRotating,
  onEnd,
  isEnding,
}: {
  readonly code: string;
  readonly admittedCount: number;
  readonly onRotate: () => void;
  readonly isRotating: boolean;
  readonly onEnd: () => void;
  readonly isEnding: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Show this code to your class. Each student types it once, after signing
        in.
      </p>

      <JoinCodeDisplay code={code} label="Class access code" />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-strong)]">
            {admittedCount}
          </span>{" "}
          {admittedCount === 1 ? "student has" : "students have"} joined
        </p>

        <div className="flex flex-wrap gap-2">
          {/* Rotate before End, and visually quieter: it is the recoverable
              action of the two. Ending the class turns the whole room out. */}
          <Button variant="secondary" size="sm" onClick={onRotate} loading={isRotating}>
            New code
          </Button>
          <Button variant="danger" size="sm" onClick={onEnd} loading={isEnding}>
            End class
          </Button>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        <span className="font-medium">New code</span> stops the current one
        working without disturbing students who have already joined — use it if
        the code has spread outside the room.{" "}
        <span className="font-medium">End class</span> signs everyone out of their
        work.
      </p>
    </div>
  );
}
