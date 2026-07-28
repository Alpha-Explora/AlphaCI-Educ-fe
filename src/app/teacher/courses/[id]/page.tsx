"use client";
// ============================================================================
// VIEW LAYER — One course and the class sections under it (ADDENDUM H).
// Classes are always created inside a course, so "Create class" lives here and
// is pre-scoped to this course — there is no standalone create-class surface.
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherCourseBoard } from "@/viewmodels/useTeacherCourseBoard";
import {
  Button,
  CardLink,
  EmptyState,
  GenericPill,
  SkeletonCard,
  Stat,
  StateBoundary,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { CreateClassModal } from "@/components/domain/CreateClassModal";

export default function TeacherCoursePage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id ?? null;
  const { user, selectedOrgId } = useSession();
  const board = useTeacherCourseBoard(user?.id ?? null, selectedOrgId);
  const [createOpen, setCreateOpen] = useState(false);

  const entry = board.entryFor(courseId);

  // Loaded cleanly, but this course isn't one of the teacher's — either a stale
  // link or another teacher's course. Say so instead of rendering an empty page.
  if (!board.isLoading && !board.error && !entry) {
    return (
      <div className="space-y-8">
        <PageHeader backHref="/teacher" backLabel="My Courses" title="Course not found" />
        <EmptyState
          icon="🔍"
          title="This course isn't assigned to you"
          description="It may have been removed, or it belongs to another teacher. Pick one of your own courses from the dashboard."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/teacher"
        backLabel="My Courses"
        title={entry ? entry.label : "Course"}
        subtitle={entry?.course.description || undefined}
        meta={
          entry && (
            <>
              <GenericPill tone="info">
                {entry.classes.length}{" "}
                {entry.classes.length === 1 ? "class" : "classes"}
              </GenericPill>
              {entry.pendingGrading > 0 && (
                <GenericPill tone="warning">{entry.pendingGrading} to grade</GenericPill>
              )}
            </>
          )
        }
        actions={
          entry && (
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <span aria-hidden="true">＋</span> Create class
            </Button>
          )
        }
      />

      {/* Per-course rollup */}
      {entry && (
        <div className="grid grid-cols-3 gap-6 rounded-xl border border-[var(--border-subtle)] bg-white p-5 shadow-card animate-fade-up sm:max-w-lg">
          <Stat label="Classes" value={entry.classes.length} tone="platform" />
          <Stat label="Students" value={entry.studentCount} />
          <Stat
            label="Pending grading"
            value={entry.pendingGrading}
            tone={entry.pendingGrading > 0 ? "warning" : "success"}
          />
        </div>
      )}

      <StateBoundary
        isLoading={board.isLoading}
        error={board.error}
        onRetry={board.refetch}
        isEmpty={(entry?.classes.length ?? 0) === 0}
        emptyFallback={
          <EmptyState
            icon="🏫"
            title="No classes in this course yet"
            description="Create your first class section to get a join code students can use to enrol."
            action={
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                <span aria-hidden="true">＋</span> Create class
              </Button>
            }
          />
        }
        loadingFallback={
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(entry?.classes ?? []).map(({ classInfo: c, sharedFromLabName }, idx) => (
            <Link
              key={c.id}
              href={`/teacher/classes/${c.id}`}
              className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
            >
              <CardLink
                className="flex h-full flex-col p-5 animate-fade-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <GenericPill tone="info">Section {c.section}</GenericPill>
                    <h3 className="mt-1 text-base font-semibold text-[var(--text-strong)]">
                      {c.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{c.term}</p>
                    {/* Same subject, different lab's course record — say where
                        it came from so the card isn't mistaken for a duplicate. */}
                    {sharedFromLabName && (
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        From <span className="font-medium">{sharedFromLabName}</span>
                      </p>
                    )}
                  </div>
                  {c.pendingGrading > 0 && (
                    <GenericPill tone="warning">{c.pendingGrading} to grade</GenericPill>
                  )}
                </div>

                <div className="mt-auto flex gap-6 pt-5">
                  <Stat label="Students" value={c.studentCount} />
                  <Stat label="Assignments" value={c.assignmentCount} />
                </div>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-platform">
                  Open section
                  <span aria-hidden="true">→</span>
                </span>
              </CardLink>
            </Link>
          ))}
        </div>
      </StateBoundary>

      {/* Create class — always scoped to the course being viewed. */}
      {entry && createOpen && (
        <CreateClassModal
          open
          courseId={entry.course.id}
          courseLabel={entry.label}
          courseCode={entry.course.code}
          courseOrgId={entry.course.orgId}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}
