"use client";
// ============================================================================
// VIEW LAYER — IT-Admin course catalog.
//
// Create catalog courses, invite teachers onto them, and create each course's
// class sections. Inviting a teacher makes them assignable to a section of that
// course — it does NOT let them create one, and never shows them another
// teacher's classes.
//
// The section button lives on each COURSE card rather than above the list: a
// section is always a section of a course, so a page-level button would have to
// open with a course picker to establish what it was creating. All
// state/mutations live in useCourseCatalog; this is presentation + local form
// state only.
// ============================================================================
import { useState } from "react";
import { useCourseCatalog } from "@/viewmodels/useCourseCatalog";
import {
  Avatar,
  Banner,
  Button,
  Card,
  EmptyState,
  Select,
  Skeleton,
  Stat,
} from "@/components/ui";
import { CreateCourseModal } from "@/components/domain/CreateCourseModal";
import type { CourseWithInstructors, SystemUser } from "@/models/types";

export function CourseCatalogCard({
  orgId,
  onCreateSection,
}: {
  readonly orgId: string | null;
  /** Open the section builder already scoped to this course. */
  readonly onCreateSection: (courseId: string) => void;
}) {
  const vm = useCourseCatalog(orgId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section className="space-y-4">
      {/* The create form is behind this button rather than sitting open above
          the list — most visits to this page are to assign a teacher, not to
          add a course. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">Course catalog</h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Create courses and assign the teachers who will run them. Sections are
            created per course, below — a teacher only sees
            a course you&apos;ve added them to — and they never see another teacher&apos;s classes.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!orgId}>
          <span aria-hidden="true">＋</span> Create course
        </Button>
      </div>

      {/* Course list */}
      {vm.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : vm.courses.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No courses yet"
          description="Add your first course, then assign the teachers who should be able to build class sections under it."
          action={
            <Button onClick={() => setCreateOpen(true)} disabled={!orgId}>
              <span aria-hidden="true">＋</span> Create course
            </Button>
          }
        />
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
              onRemoveInstructor={(teacherId) =>
                vm.removeInstructor(course.id, teacherId)
              }
              onCreateSection={() => onCreateSection(course.id)}
              removingInstructorKey={vm.removingInstructorKey}
              isRemovingInstructor={vm.isRemovingInstructor}
              removeInstructorError={vm.removeInstructorError}
            />
          ))}
        </div>
      )}

      <CreateCourseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        vm={vm}
        orgId={orgId}
      />
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
  onRemoveInstructor,
  onCreateSection,
  removingInstructorKey,
  isRemovingInstructor,
  removeInstructorError,
}: {
  readonly course: CourseWithInstructors;
  readonly teachers: SystemUser[];
  readonly onInvite: (teacherId: string) => void;
  readonly isInviting: boolean;
  readonly inviteError: string | null;
  readonly onDelete: () => void;
  readonly isDeleting: boolean;
  readonly deleteError: string | null;
  readonly onRemoveInstructor: (teacherId: string) => void;
  readonly onCreateSection: () => void;
  readonly removingInstructorKey: string | null;
  readonly isRemovingInstructor: boolean;
  readonly removeInstructorError: string | null;
}) {
  const [teacherId, setTeacherId] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Which instructor's "Remove?" confirmation is showing, if any.
  const [confirmingInstructorId, setConfirmingInstructorId] = useState<string | null>(
    null,
  );
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

      {/*
        SCOPED TO THIS COURSE. A class section is always a section OF a course,
        so the button belongs where the course is the thing you are standing on —
        a page-level one had to open with a course picker just to establish what
        it was creating, which is the question this card has already answered.

        Disabled until the course has a teacher: a section names the teacher who
        runs it, and offering the action with nobody to assign would open a form
        whose only choice is empty.
      */}
      <div className="mt-3">
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-center"
          disabled={course.instructors.length === 0}
          title={
            course.instructors.length === 0
              ? "Assign a teacher to this course first — a section names the teacher who runs it"
              : undefined
          }
          onClick={onCreateSection}
        >
          <span aria-hidden="true">＋</span> Create class section
        </Button>
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
            {course.instructors.map((t) => {
              const busy =
                isRemovingInstructor && removingInstructorKey === `${course.id}:${t.id}`;
              return (
                <li key={t.id} className="flex items-center gap-2">
                  <Avatar name={t.fullName} color={t.avatarColor} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-strong)]">
                    {t.fullName}
                  </span>

                  {/* Confirmed rather than instant: revoking the grant can also
                      remove this teacher from the laboratory entirely, when the
                      course is the only reason they have access to it. */}
                  {confirmingInstructorId === t.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="danger"
                        size="sm"
                        loading={busy}
                        onClick={() => {
                          onRemoveInstructor(t.id);
                          setConfirmingInstructorId(null);
                        }}
                      >
                        Remove
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setConfirmingInstructorId(null)}
                      >
                        Cancel
                      </Button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Remove ${t.fullName} from ${course.code}`}
                      onClick={() => setConfirmingInstructorId(t.id)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Scoped to this course — the VM reports which grant the last removal
            targeted, so a 409 lands on the card that produced it. */}
        {removeInstructorError &&
          removingInstructorKey?.startsWith(`${course.id}:`) && (
            <Banner tone="error" className="mt-2">
              {removeInstructorError}
            </Banner>
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
