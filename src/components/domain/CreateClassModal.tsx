"use client";
// ============================================================================
// VIEW LAYER — Create class modal (teacher, ADDENDUM E + ADDENDUM H)
// A class is always a section/term of an IT-Admin-owned Course. Two modes:
//
//   course-scoped  — the caller passes courseId (the course page's button), so
//                    the teacher only sets section + term.
//   unscoped       — the caller passes nothing (the Dashboard's button): the
//                    teacher picks a LABORATORY, then one of their courses in
//                    it, then section + term.
//
// A class has no laboratory of its own — ClassesService.createClass reads it
// off the chosen course's orgId. So the laboratory field here is a FILTER over
// the course list, not a separate value that gets submitted; picking a lab is
// how a teacher reaches their courses in a lab other than the active one,
// without touching the top-bar switcher.
//
// On success the new class's auto-generated join code is shown so the teacher
// can share it. Form state is local; validation/mutation/invalidation live in
// useCreateClass.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useCreateClass } from "@/viewmodels/useCreateClass";
import { useTeacherCourses } from "@/viewmodels/useTeacherCourses";
import { useDuplicateClassCheck } from "@/viewmodels/useDuplicateClassCheck";
import { useCourseCodesByLab } from "@/viewmodels/useCourseCodesByLab";
import { Banner, Button, Field, Input, Modal, Select, cn } from "@/components/ui";
import { JoinCodeDisplay } from "./JoinCodeDisplay";

/**
 * Which laboratories this class physically meets in.
 *
 * Each row says whether that lab's catalog also carries this course, because
 * that is the fact a teacher needs and cannot otherwise see:
 *
 *   - the OWNING lab is where the repositories go, whether or not the class
 *     ever meets there — so it is labelled, never forced;
 *   - another lab that HAS the same course code may already run its own section
 *     of it under a different teacher — worth knowing before assuming the room
 *     is yours;
 *   - another lab WITHOUT the course is simply a room being borrowed, which is
 *     normal and is the case this field exists for.
 *
 * Ticking a lab never creates anything there. It annotates this ONE class,
 * which is what keeps a cohort that moves between labs on a single roster and
 * a single gradebook.
 */
function MeetingLabChecklist({
  labs,
  selected,
  onToggle,
  courseCode,
  owningOrgId,
}: Readonly<{
  /** Only labs the teacher actually teaches in — see the caller. */
  labs: Array<{ id: string; name: string }>;
  selected: string[];
  onToggle: (labId: string) => void;
  courseCode: string | null;
  owningOrgId: string | null;
}>) {
  const codes = useCourseCodesByLab();
  // Nothing to choose between when they teach in a single lab.
  if (labs.length <= 1) return null;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-[var(--text-strong)]">
        Laboratories used
      </legend>
      <p className="text-xs text-[var(--text-muted)]">
        Optional — where this class actually meets. Ticking a laboratory makes this
        class show up there too, still as one class with one roster and one
        gradebook. Its repositories always live in the laboratory that owns the
        course.
      </p>

      <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-[var(--border-subtle)] p-1.5">
        {labs.map((lab) => {
          const isOwner = lab.id === owningOrgId;
          const hasCourse = codes.labHasCode(lab.id, courseCode);

          // "catalog has …" rather than "also has …": this is a statement about
          // the COURSE list, and the shorter wording was read as "there is
          // already a class over there", which is a different claim entirely.
          let note: string | null = null;
          if (isOwner) note = "stores this class's work";
          else if (hasCourse) note = `catalog has ${courseCode}`;

          return (
            <label
              key={lab.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(lab.id)}
                onChange={() => onToggle(lab.id)}
                className="h-4 w-4 shrink-0 accent-platform"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-strong)]">
                {lab.name}
              </span>
              {note && (
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    isOwner ? "text-platform" : "text-amber-700",
                  )}
                >
                  {note}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CreateClassModal({
  open,
  onClose,
  courseId,
  courseLabel,
  courseCode,
  courseOrgId,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  /** Course-scoped mode: when set, the class is created under this course and
   *  no course picker is shown. */
  courseId?: string;
  /** Human label for the preselected course, e.g. "IS-2601 — WebApp2". */
  courseLabel?: string;
  /** Just the code, e.g. "IS-2601" — powers the already-run-this check. */
  courseCode?: string;
  /** The lab that owns the course, i.e. where its repositories will live. */
  courseOrgId?: string;
}>) {
  const { user, labs, selectedOrgId } = useSession();
  const vm = useCreateClass();
  /*
    Loaded in BOTH modes, and deliberately NOT scoped to the active lab.

    Unscoped mode needs it for the course picker. Scoped mode needs it too, for
    the meeting-laboratory checklist: a teacher should only be offered labs they
    actually teach in, and a course assignment is what "teaching in a lab" means
    here. The session's lab list is wider than that — it also counts plain
    GitHub membership — so using it would offer a teacher with a single course a
    laboratory they have no business putting a class in.
  */
  const coursesVm = useTeacherCourses(user?.id ?? null);
  const [pickedLabId, setPickedLabId] = useState("");
  const [pickedCourseId, setPickedCourseId] = useState("");
  const [section, setSection] = useState("");
  const [term, setTerm] = useState("");
  const [meetingLabOrgIds, setMeetingLabOrgIds] = useState<string[]>([]);

  const created = vm.createdClass;
  const isScoped = Boolean(courseId);
  const effectiveCourseId = courseId ?? pickedCourseId;
  const hasCourses = coursesVm.courses.length > 0;

  /*
    The laboratories offered are derived from the courses themselves rather than
    from the session's lab list: a teacher's course grant is one of the things
    that GRANTS lab access (AuthService.getAccessibleLabs), so deriving from the
    courses can't produce a lab with nothing in it, and can't drop one whose
    membership hasn't been recorded any other way. Names come from the session.
  */
  const labChoices = useMemo(() => {
    const nameById = new Map(labs.map((l) => [l.id, l.name]));
    const ids = [...new Set(coursesVm.courses.map((c) => c.orgId))];
    return ids
      .map((id) => ({ id, name: nameById.get(id) ?? "Unknown laboratory" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [coursesVm.courses, labs]);

  // Default to the lab being viewed when it has courses, else the first that
  // does — so the common case needs no interaction with this field at all.
  useEffect(() => {
    if (labChoices.length === 0) return;
    setPickedLabId((current) => {
      if (current && labChoices.some((l) => l.id === current)) return current;
      const active = labChoices.find((l) => l.id === selectedOrgId);
      return active?.id ?? labChoices[0].id;
    });
  }, [labChoices, selectedOrgId]);

  const coursesInLab = coursesVm.courses.filter((c) => c.orgId === pickedLabId);

  // In scoped mode the caller supplies the code; unscoped, read it off the pick.
  const effectiveCourseCode =
    courseCode ??
    coursesVm.courses.find((c) => c.id === pickedCourseId)?.code ??
    null;
  // The lab that will actually store this class's repositories.
  const owningOrgId =
    courseOrgId ??
    coursesVm.courses.find((c) => c.id === pickedCourseId)?.orgId ??
    null;

  const duplicate = useDuplicateClassCheck({
    teacherId: user?.id ?? null,
    labs,
    courseCode: effectiveCourseCode,
    section,
    term,
    targetOrgId: owningOrgId,
  });

  function pickLab(labId: string) {
    setPickedLabId(labId);
    // The old course belongs to the old lab, so keep it from being submitted
    // against the new one.
    setPickedCourseId("");
  }

  function handleClose() {
    vm.reset();
    setPickedLabId("");
    setPickedCourseId("");
    setSection("");
    setTerm("");
    setMeetingLabOrgIds([]);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={created ? "Class created" : "Create class"}
      description={
        created
          ? undefined
          : isScoped
            ? "Set the section and term for this class. A join code is generated automatically."
            : labChoices.length > 1
              ? "Pick the laboratory and one of your courses in it, then set the section and term."
              : "Pick one of your assigned courses, then set the section and term."
      }
      size="md"
    >
      {created ? (
        // ---- Success: show the join code prominently ----
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-strong)]">
              {created.name}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              {created.code}
              {created.section ? ` · Section ${created.section}` : ""} · {created.term}
            </p>
          </div>

          <JoinCodeDisplay code={created.magicJoinCode} />

          <p className="text-sm text-[var(--text-muted)]">
            Write this on the whiteboard — students enter it under{" "}
            <strong className="text-[var(--text-strong)]">+ Join Class</strong>.
          </p>

          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
            <Link href={`/teacher/classes/${created.id}`} onClick={handleClose}>
              <Button>Open class →</Button>
            </Link>
          </div>
        </div>
      ) : !isScoped && !coursesVm.isLoading && !hasCourses ? (
        // ---- Fallback picker mode with no assigned courses ----
        <div className="space-y-4">
          <Banner tone="warning" title="No courses assigned yet">
            You haven&apos;t been added to any courses. Ask your IT Admin to invite
            you to a course — then you can create class sections under it.
          </Banner>
          <div className="flex justify-end border-t border-[var(--border-subtle)] pt-4">
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        // ---- Form ----
        <form
          onSubmit={(e) => {
            e.preventDefault();
            vm.submit({
              courseId: effectiveCourseId,
              section,
              term,
              meetingLabOrgIds,
            });
          }}
          noValidate
          className="space-y-4"
        >
          {isScoped ? (
            // Course-scoped: show the course as read-only context, no picker.
            <div className="rounded-lg border border-[var(--border-subtle)] bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Course
              </p>
              <p className="mt-0.5 text-sm font-medium text-[var(--text-strong)]">
                {courseLabel ?? "Selected course"}
              </p>
            </div>
          ) : (
            <>
              {/* Only worth a field when there's a genuine choice — a teacher at
                  one school shouldn't have to answer a question with one answer. */}
              {labChoices.length > 1 && (
                <Field
                  label="Laboratory"
                  required
                  hint="Where this class's repositories are stored — not the room you meet in"
                >
                  {({ id }) => (
                    <Select
                      id={id}
                      value={pickedLabId}
                      onChange={(e) => pickLab(e.target.value)}
                      disabled={coursesVm.isLoading}
                      autoFocus
                    >
                      {labChoices.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                          {l.id === selectedOrgId ? " (currently viewing)" : ""}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}

              <Field
                label="Course"
                required
                hint="Only courses you were assigned to appear here"
              >
                {({ id }) => (
                  <Select
                    id={id}
                    value={pickedCourseId}
                    onChange={(e) => setPickedCourseId(e.target.value)}
                    disabled={coursesVm.isLoading || coursesInLab.length === 0}
                    autoFocus={labChoices.length <= 1}
                  >
                    <option value="" disabled>
                      {coursesVm.isLoading ? "Loading courses…" : "Select a course"}
                    </option>
                    {coursesInLab.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Section" required hint="e.g. A">
              {({ id }) => (
                <Input
                  id={id}
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="A"
                  autoComplete="off"
                  autoFocus={isScoped}
                />
              )}
            </Field>
            <Field label="Term" required hint="e.g. Fall 2026">
              {({ id }) => (
                <Input
                  id={id}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Fall 2026"
                  autoComplete="off"
                />
              )}
            </Field>
          </div>

          <MeetingLabChecklist
            labs={labChoices}
            selected={meetingLabOrgIds}
            onToggle={(labId) =>
              setMeetingLabOrgIds((prev) =>
                prev.includes(labId)
                  ? prev.filter((id) => id !== labId)
                  : [...prev, labId],
              )
            }
            courseCode={effectiveCourseCode}
            owningOrgId={owningOrgId}
          />

          {/*
            The mistake this exists to catch: a teacher who already runs this
            section re-creates it because they're meeting in a different lab
            today. That yields two rosters and two gradebooks for one cohort.
            A warning rather than a block — two labs genuinely CAN each need
            their own section, and only the teacher knows which case this is.
          */}
          {duplicate && (
            <Banner
              tone="warning"
              title={
                duplicate.isSameLab
                  ? "You already have this section"
                  : `You already run this section in ${duplicate.labName}`
              }
            >
              <p>
                {duplicate.existing.code} · Section {duplicate.existing.section} ·{" "}
                {duplicate.existing.term} already exists
                {duplicate.isSameLab ? "" : ` in ${duplicate.labName}`}. If this is
                the same group of students, open that one instead — a second class
                would split your roster, projects and grades across two records.
              </p>
              <Link
                href={`/teacher/classes/${duplicate.existing.id}`}
                onClick={handleClose}
                className="mt-1 inline-block font-medium text-platform hover:underline"
              >
                Open the existing class →
              </Link>
            </Banner>
          )}

          {vm.validationErrors.length > 0 && (
            <Banner tone="warning" title="Please fix the following">
              <ul className="ml-4 list-disc space-y-0.5">
                {vm.validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </Banner>
          )}
          {vm.message && (
            <Banner tone={vm.error?.isNetworkError ? "network" : "error"}>
              {vm.message}
            </Banner>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={vm.isSubmitting}>
              Create class
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
