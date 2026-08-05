"use client";
// ============================================================================
// VIEW LAYER — the IT admin creates a section and books its slot.
//
// The timetable moved here from the teacher because a section's hours book a
// PERSON and a ROOM, and neither is one teacher's to claim. This is the screen
// that can see the whole timetable at the moment of the decision, which is what
// makes "two classes in one laboratory at one hour" a rule anyone can enforce.
//
// CONFLICTS ARE SHOWN, NOT JUST REFUSED. The server checks again on save — this
// is not a security boundary — but an admin who only learns about a clash from a
// rejected Save has to guess what to change. The check runs as they pick, and
// the message names the section, the days and the hours in the way.
//
// The teacher list comes from the COURSE's instructors rather than from all
// staff: a section can only be given to someone already assigned to teach that
// course, so offering anyone else would be offering a choice the server refuses.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/viewmodels/useSession";
import { useCourseCatalog } from "@/viewmodels/useCourseCatalog";
import { useAdminCreateSection } from "@/viewmodels/useAdminCreateSection";
import { ScheduleGridPicker } from "./ScheduleGridPicker";
import type { ClassSchedule } from "@/models/types";
import {
  Banner,
  Button,
  Field,
  Input,
  Modal,
  Select,
  cn,
} from "@/components/ui";

export function AdminCreateSectionModal({
  open,
  onClose,
  orgId,
  courseId: scopedCourseId,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  /** The laboratory whose catalogue is being managed. */
  readonly orgId: string;
  /**
   * The course this section belongs to — always supplied, because the builder is
   * opened from a course's own card. A picker would ask a question the page the
   * admin is standing on has already answered.
   */
  readonly courseId: string;
}) {
  const { labs } = useSession();
  const catalog = useCourseCatalog(orgId);

  const courseId = scopedCourseId;
  const [teacherId, setTeacherId] = useState("");
  const [section, setSection] = useState("");
  const [term, setTerm] = useState("");
  const [labIds, setLabIds] = useState<string[]>([orgId]);
  /*
    A LIST of windows, because a section genuinely meets more than once. Held as
    whole windows rather than as separate day and time state: the grid produces
    days and hours together, and three separate pieces of state could hold a
    half-valid slot the grid cannot draw.
  */
  const [slots, setSlots] = useState<ClassSchedule[]>([]);

  // Declared AFTER the state it reads: the grid shades whatever the current
  // teacher and rooms already have booked, so occupancy is keyed on both and
  // refetches as either changes.
  const vm = useAdminCreateSection({
    teacherId: teacherId || undefined,
    labOrgIds: labIds,
  });

  const course = catalog.courses.find((c) => c.id === courseId) ?? null;

  // Teacher must belong to the chosen course; clear a stale pick when the course
  // changes rather than sending one the server will refuse.
  useEffect(() => {
    setTeacherId((current) =>
      course?.instructors.some((i) => i.id === current) ? current : "",
    );
  }, [course]);

  /*
    Only worth checking once at least one window exists. With none there is
    nothing to ask about, and asking anyway would flash "no conflicts" at a form
    that is not yet filled in. The grid can only produce whole windows, so any
    non-empty list is already a real one.
  */
  const slotIsComplete = slots.length > 0;

  useEffect(() => {
    if (!open || !slotIsComplete) return;
    const id = setTimeout(() => {
      vm.check({
        schedule: slots,
        teacherId: teacherId || undefined,
        labOrgIds: labIds,
      });
    }, 250); // Debounced: a drag fires many updates before it settles.
    return () => clearTimeout(id);
    // vm identity changes each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slotIsComplete, slots, teacherId, labIds]);

  const labChoices = useMemo(
    () => labs.map((l) => ({ id: l.id, name: l.name })),
    [labs],
  );

  const teacherConflicts = vm.conflicts.filter((c) => c.kind === "TEACHER");
  const labConflicts = vm.conflicts.filter((c) => c.kind === "LABORATORY");
  const blocked = vm.conflicts.length > 0;

  const canSubmit =
    Boolean(courseId && teacherId && section.trim() && term.trim()) &&
    (!slotIsComplete || !blocked) &&
    !vm.isCreating;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    vm.create({
      courseId,
      teacherId,
      section: section.trim(),
      term: term.trim(),
      meetingLabOrgIds: labIds,
      ...(slotIsComplete ? { schedule: slots } : {}),
    });
  };

  if (vm.createdClass) {
    return (
      <Modal open={open} onClose={onClose} title="Section created" size="md">
        <div className="space-y-4">
          <Banner tone="success">
            {vm.createdClass.code} · {vm.createdClass.section} is in the timetable.
          </Banner>
          <p className="text-sm text-[var(--text-muted)]">
            Its teacher can start the class and hand out the code. Students join with{" "}
            <code className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-xs">
              {vm.createdClass.magicJoinCode}
            </code>
            .
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                vm.reset();
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={course ? `New section of ${course.code}` : "Create a class section"}
      description="You choose the teacher and the hours. A section cannot double-book a teacher or a laboratory."
      size="wide"
      fitViewport
    >
      {/*
        LANDSCAPE, and capped at the viewport. Stacked, this dialog was a metre
        of scroll: the booking grid alone is sixteen hours tall, so the fields
        that decide WHOSE week it shades scrolled off the top exactly when the
        admin needed them. Side by side, the grid and its inputs are visible at
        once — which is the whole argument for a grid over two time fields.

        `fitViewport` makes the panel a flex column that hands its height here,
        so each side scrolls on its own and the footer never leaves the screen.
      */}
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        {/*
          `[22rem_1fr]`, NOT `[22rem_minmax(0,1fr)]`. Tailwind's class extractor
          drops an arbitrary value containing a comma — it compiles to no rule at
          all and the grid silently collapses to one column. Verified against the
          built CSS. `min-w-0` on the grid child below does the job minmax(0,…)
          would have done, keeping the picker from widening its own track.
        */}
        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[22rem_1fr] lg:overflow-hidden">
          {/* Left: who and what. */}
          <div className="min-h-0 space-y-5 lg:overflow-y-auto lg:pr-1">
        {vm.createError && <Banner tone="error">{vm.createError.message}</Banner>}

        {/* Stated, not chosen — the course is the card this was opened from. */}
        <div className="rounded-lg bg-[var(--bg-subtle)] px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">Course</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-strong)]">
            {course ? `${course.code} — ${course.title}` : "Loading…"}
          </p>
        </div>

        <Field
          label="Teacher"
          required
          hint={
            course && course.instructors.length === 0
              ? "This course has no teachers yet. Assign one to the course first."
              : "Only teachers assigned to this course can be given a section of it."
          }
        >
          {({ id }) => (
            <Select
              id={id}
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              disabled={!course || course.instructors.length === 0}
            >
              <option value="">Choose a teacher…</option>
              {course?.instructors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Section" required>
            {({ id }) => (
              <Input
                id={id}
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A"
                maxLength={12}
              />
            )}
          </Field>
          <Field label="Term" required>
            {({ id }) => (
              <Input
                id={id}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Fall 2026"
                maxLength={40}
              />
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-[var(--text-strong)]">
            Laboratory
          </legend>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Where this section physically meets. Two sections cannot share a room at
            the same hour.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {labChoices.map((lab) => {
              const on = labIds.includes(lab.id);
              return (
                <button
                  key={lab.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setLabIds((cur) =>
                      on ? cur.filter((x) => x !== lab.id) : [...cur, lab.id],
                    )
                  }
                  className={cn(
                    "rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors",
                    on
                      ? "bg-platform-50 text-platform-800 ring-platform-300"
                      : "bg-white text-[var(--text-muted)] ring-[var(--border-subtle)] hover:bg-slate-50",
                  )}
                >
                  {lab.name}
                </button>
              );
            })}
          </div>
        </fieldset>

          </div>

          {/* Right: when. */}
          <fieldset className="flex min-h-0 min-w-0 flex-col lg:overflow-hidden">
            <legend className="text-sm font-medium text-[var(--text-strong)]">
              Class hours
            </legend>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Philippine time. Leave it empty to create the section without hours and
              set them later.
            </p>

          {/*
            The grid needs to know WHOSE week to shade, so it only becomes useful
            once a teacher is chosen. Before that it would show an empty week and
            imply every slot was free.
          */}
            <div className="mt-2 min-h-0 flex-1 lg:overflow-y-auto">
              {teacherId ? (
                <ScheduleGridPicker
                  bookings={vm.bookings}
                  value={slots}
                  onChange={setSlots}
                />
              ) : (
                <p className="rounded-lg bg-[var(--bg-subtle)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                  Choose a teacher first — the grid shades the slots they and the
                  laboratory already have booked.
                </p>
              )}
            </div>
          </fieldset>
        </div>

        {/* Pinned under both columns: a refusal that scrolled with the grid
            would be missed by the admin who caused it. */}
        <div className="shrink-0 space-y-3 border-t border-[var(--border-subtle)] px-6 py-4">
        {blocked && (
          <Banner tone="error" title="These hours are already taken">
            <ul className="mt-1 space-y-1">
              {teacherConflicts.map((c) => (
                <li key={`t-${c.classId}`}>{c.message}</li>
              ))}
              {labConflicts.map((c) => (
                <li key={`l-${c.classId}`}>{c.message}</li>
              ))}
            </ul>
          </Banner>
        )}
        {slotIsComplete && !blocked && !vm.isChecking && (
          <Banner tone="success">
            {slots.length === 1 ? "This slot is" : "All of these slots are"} free
            for the teacher and the laboratory.
          </Banner>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={vm.isCreating} disabled={!canSubmit}>
            Create section
          </Button>
        </div>
        </div>
      </form>
    </Modal>
  );
}
