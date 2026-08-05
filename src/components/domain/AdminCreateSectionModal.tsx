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
import { WEEKDAYS } from "@/viewmodels/useClassSchedule";
import { formatTime12 } from "@/models/schedule";
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
  const vm = useAdminCreateSection();

  const courseId = scopedCourseId;
  const [teacherId, setTeacherId] = useState("");
  const [section, setSection] = useState("");
  const [term, setTerm] = useState("");
  const [labIds, setLabIds] = useState<string[]>([orgId]);
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");

  const course = catalog.courses.find((c) => c.id === courseId) ?? null;

  // Teacher must belong to the chosen course; clear a stale pick when the course
  // changes rather than sending one the server will refuse.
  useEffect(() => {
    setTeacherId((current) =>
      course?.instructors.some((i) => i.id === current) ? current : "",
    );
  }, [course]);

  /*
    A slot is only checkable once it is a real window: at least one day, and an
    end after a start. Below that there is nothing to ask about, and asking
    anyway would flash "no conflicts" at a form that is not yet filled in.
  */
  const slotIsComplete = days.length > 0 && endTime > startTime;

  useEffect(() => {
    if (!open || !slotIsComplete) return;
    const id = setTimeout(() => {
      vm.check({
        schedule: { days, startTime, endTime },
        teacherId: teacherId || undefined,
        labOrgIds: labIds,
      });
    }, 300); // Debounced: the times change on every keystroke of a time input.
    return () => clearTimeout(id);
    // vm identity changes each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slotIsComplete, days, startTime, endTime, teacherId, labIds]);

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
      ...(slotIsComplete ? { schedule: { days, startTime, endTime } } : {}),
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
      size="lg"
    >
      <form onSubmit={submit} className="space-y-5">
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

        <fieldset>
          <legend className="text-sm font-medium text-[var(--text-strong)]">
            Class hours
          </legend>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Philippine time. Leave the days empty to create the section without hours
            and set them later.
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={on}
                  aria-label={d.label}
                  onClick={() =>
                    setDays((cur) =>
                      on ? cur.filter((x) => x !== d.value) : [...cur, d.value],
                    )
                  }
                  className={cn(
                    "h-9 w-12 rounded-lg text-sm font-medium ring-1 ring-inset transition-colors",
                    on
                      ? "bg-platform-600 text-white ring-platform-600"
                      : "bg-white text-[var(--text-muted)] ring-[var(--border-subtle)] hover:bg-slate-50",
                  )}
                >
                  {d.short}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="From">
              {({ id }) => (
                <Input
                  id={id}
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              )}
            </Field>
            <Field label="To">
              {({ id }) => (
                <Input
                  id={id}
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              )}
            </Field>
          </div>

          {slotIsComplete && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {formatTime12(startTime)} – {formatTime12(endTime)}, {days.length}{" "}
              {days.length === 1 ? "day" : "days"} a week.
            </p>
          )}
          {days.length > 0 && endTime <= startTime && (
            <Banner tone="warning" className="mt-2">
              The end time must be after the start time. Overnight windows are not
              supported.
            </Banner>
          )}
        </fieldset>

        {/* The whole point of moving this to the admin. */}
        {blocked && (
          <Banner tone="error" title="This slot is already taken">
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
            This slot is free for the teacher and the laboratory.
          </Banner>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={vm.isCreating} disabled={!canSubmit}>
            Create section
          </Button>
        </div>
      </form>
    </Modal>
  );
}
