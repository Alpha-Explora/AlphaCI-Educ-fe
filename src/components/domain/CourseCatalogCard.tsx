"use client";
// ============================================================================
// VIEW LAYER — IT-Admin course catalog (ADDENDUM H)
// Create catalog courses and invite teachers onto them. Inviting a teacher
// grants them immediate access to create class sections under that course —
// but NOT visibility into other teachers' classes. All state/mutations live in
// useCourseCatalog; this component is presentation + local form state only.
// ============================================================================
import { useState } from "react";
import { useCourseCatalog } from "@/viewmodels/useCourseCatalog";
import {
  Avatar,
  Banner,
  Button,
  Card,
  Field,
  Input,
  Select,
  Skeleton,
  Stat,
} from "@/components/ui";
import type { CourseWithInstructors, SystemUser } from "@/models/types";

export function CourseCatalogCard({ orgId }: { orgId: string | null }) {
  const vm = useCourseCatalog(orgId);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return;
    vm.createCourse({ code: code.trim(), title: title.trim(), description: description.trim() });
    setCode("");
    setTitle("");
    setDescription("");
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-strong)]">Course catalog</h2>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          Create courses and assign instructors. A teacher can only build class sections under
          a course you&apos;ve added them to — and they never see another teacher&apos;s classes.
        </p>
      </div>

      {/* Create course */}
      <Card className="p-5">
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[10rem,1fr]">
            <Field label="Course code" required hint="e.g. CS-301">
              {({ id }) => (
                <Input
                  id={id}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CS-301"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
              )}
            </Field>
            <Field label="Title" required hint="e.g. Algorithms">
              {({ id }) => (
                <Input
                  id={id}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Algorithms"
                  autoComplete="off"
                />
              )}
            </Field>
          </div>
          <Field label="Description" hint="Optional">
            {({ id }) => (
              <Input
                id={id}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this course covers"
                autoComplete="off"
              />
            )}
          </Field>
          {vm.createError && <Banner tone="error">{vm.createError}</Banner>}
          <div className="flex justify-end">
            <Button type="submit" loading={vm.isCreating}>
              <span aria-hidden="true">＋</span> Create course
            </Button>
          </div>
        </form>
      </Card>

      {/* Course list */}
      {vm.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : vm.courses.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No courses yet — create your first above.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vm.courses.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              teachers={vm.teachers}
              onInvite={(teacherId) => vm.addInstructor(course.id, { teacherId })}
              isInviting={vm.isInviting && vm.invitingCourseId === course.id}
              inviteError={vm.invitingCourseId === course.id ? vm.inviteError : null}
              onDelete={() => vm.deleteCourse(course.id)}
              isDeleting={vm.isDeleting && vm.deletingCourseId === course.id}
              deleteError={vm.deletingCourseId === course.id ? vm.deleteError : null}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CourseRow({
  course,
  teachers,
  onInvite,
  isInviting,
  inviteError,
  onDelete,
  isDeleting,
  deleteError,
}: {
  course: CourseWithInstructors;
  teachers: SystemUser[];
  onInvite: (teacherId: string) => void;
  isInviting: boolean;
  inviteError: string | null;
  onDelete: () => void;
  isDeleting: boolean;
  deleteError: string | null;
}) {
  const [teacherId, setTeacherId] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const assignedIds = new Set(course.instructors.map((i) => i.id));
  const available = teachers.filter((t) => !assignedIds.has(t.id));
  const hasSections = course.classCount > 0;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-platform">
            {course.code}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-[var(--text-strong)]">
            {course.title}
          </h3>
        </div>
        <Stat label="Sections" value={course.classCount} />
      </div>

      {/* Delete course (IT-Admin). Blocked while the course still has sections. */}
      <div className="mt-3">
        {confirmingDelete ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 ring-1 ring-inset ring-red-200">
            <span className="flex-1 text-sm text-red-700">Delete {course.code}?</span>
            <Button
              variant="danger"
              size="sm"
              loading={isDeleting}
              onClick={() => onDelete()}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            disabled={hasSections}
            title={
              hasSections
                ? "Remove this course's class sections before deleting it"
                : undefined
            }
            onClick={() => setConfirmingDelete(true)}
          >
            <span aria-hidden="true">🗑</span>{" "}
            {hasSections ? "Delete (remove sections first)" : "Delete course"}
          </Button>
        )}
        {deleteError && (
          <Banner tone="error" className="mt-2">
            {deleteError}
          </Banner>
        )}
      </div>

      {course.description && (
        <p className="mt-2 text-sm text-[var(--text-muted)]">{course.description}</p>
      )}

      {/* Instructors */}
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Instructors
        </p>
        {course.instructors.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">None assigned yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {course.instructors.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <Avatar name={t.fullName} color={t.avatarColor} size="sm" />
                <span className="truncate text-sm text-[var(--text-strong)]">{t.fullName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invite */}
      <div className="mt-auto pt-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              aria-label={`Add instructor to ${course.code}`}
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              disabled={available.length === 0}
            >
              <option value="" disabled>
                {available.length === 0 ? "All teachers assigned" : "Add a teacher…"}
              </option>
              {available.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="secondary"
            disabled={!teacherId}
            loading={isInviting}
            onClick={() => {
              if (!teacherId) return;
              onInvite(teacherId);
              setTeacherId("");
            }}
          >
            Invite
          </Button>
        </div>
        {inviteError && (
          <Banner tone="error" className="mt-2">
            {inviteError}
          </Banner>
        )}
      </div>
    </Card>
  );
}
