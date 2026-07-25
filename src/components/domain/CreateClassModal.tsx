"use client";
// ============================================================================
// VIEW LAYER — Create class modal (teacher, ADDENDUM E + ADDENDUM H)
// A class is always a section/term of an IT-Admin-owned Course. This modal is
// opened FROM a course (course-scoped): the caller passes the courseId, so the
// teacher never picks a course here — they just set section + term. (A picker
// fallback remains for callers that don't pass a course.) On success the new
// class's auto-generated join code is shown so the teacher can share it.
// Form state is local; validation/mutation/invalidation live in useCreateClass.
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useCreateClass } from "@/viewmodels/useCreateClass";
import { useTeacherCourses } from "@/viewmodels/useTeacherCourses";
import { Banner, Button, Field, Input, Modal, Select } from "@/components/ui";
import { JoinCodeDisplay } from "./JoinCodeDisplay";

export function CreateClassModal({
  open,
  onClose,
  courseId,
  courseLabel,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  /** Course-scoped mode: when set, the class is created under this course and
   *  no course picker is shown. */
  courseId?: string;
  /** Human label for the preselected course, e.g. "IS-2601 — WebApp2". */
  courseLabel?: string;
}>) {
  const { user } = useSession();
  const vm = useCreateClass();
  // Only needed for the fallback picker (when no course was passed in).
  const coursesVm = useTeacherCourses(courseId ? null : user?.id ?? null);
  const [pickedCourseId, setPickedCourseId] = useState("");
  const [section, setSection] = useState("");
  const [term, setTerm] = useState("");

  const created = vm.createdClass;
  const isScoped = Boolean(courseId);
  const effectiveCourseId = courseId ?? pickedCourseId;
  const hasCourses = coursesVm.courses.length > 0;

  function handleClose() {
    vm.reset();
    setPickedCourseId("");
    setSection("");
    setTerm("");
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
            vm.submit({ courseId: effectiveCourseId, section, term });
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
            <Field label="Course" required hint="Only courses you were assigned to appear here">
              {({ id }) => (
                <Select
                  id={id}
                  value={pickedCourseId}
                  onChange={(e) => setPickedCourseId(e.target.value)}
                  disabled={coursesVm.isLoading}
                  autoFocus
                >
                  <option value="" disabled>
                    {coursesVm.isLoading ? "Loading courses…" : "Select a course"}
                  </option>
                  {coursesVm.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
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
