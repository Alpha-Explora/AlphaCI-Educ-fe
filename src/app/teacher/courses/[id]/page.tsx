"use client";
// ============================================================================
// VIEW LAYER — One course and the class sections under it (ADDENDUM H).
// Classes are created by the IT ADMIN now — a section's hours book a teacher and
// a laboratory, so it is not one teacher's setting. This page lists them and
// is pre-scoped to this course — there is no standalone create-class surface.
// ============================================================================
import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherCourseBoard } from "@/viewmodels/useTeacherCourseBoard";
import {
  Button,
  EmptyState,
  GenericPill,
  SkeletonCard,
  Stat,
  StateBoundary,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { ClassCard } from "@/components/domain/ClassCard";

export default function TeacherCoursePage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id ?? null;
  const { user, selectedOrgId } = useSession();
  const board = useTeacherCourseBoard(user?.id ?? null, selectedOrgId);

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
            description="Your IT admin creates the sections for this course and books their hours, so a section never double-books you or a laboratory. Ask them to add one."
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
        {/* Each section carries whatever colour its teacher gave it — the
            `sharedFromLabName` note keeps a borrowed section from reading as a
            duplicate of the local one. See ClassCard. */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(entry?.classes ?? []).map(({ classInfo: c, sharedFromLabName }, idx) => (
            <ClassCard
              key={c.id}
              classInfo={c}
              fromLabName={sharedFromLabName}
              index={idx}
            />
          ))}
        </div>
      </StateBoundary>

    </div>
  );
}
