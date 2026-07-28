"use client";
// ============================================================================
// VIEW LAYER — Teacher dashboard (ADDENDUM H — course-centric)
// Courses are the top level: each course an IT Admin assigned this teacher gets
// one card here. The class sections the teacher created under a course live on
// that course's own page (/teacher/courses/[id]), where they are also created.
// Data/derivation live in the ViewModels (useTeacherCourseBoard).
// ============================================================================
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherCourseBoard } from "@/viewmodels/useTeacherCourseBoard";
import {
  CardLink,
  EmptyState,
  SkeletonCard,
  Stat,
  StateBoundary,
  GenericPill,
} from "@/components/ui";

export default function TeacherDashboardPage() {
  const { user, selectedOrgId } = useSession();
  const board = useTeacherCourseBoard(user?.id ?? null, selectedOrgId);

  return (
    <div className="space-y-8">
      {/* Title on the left, summary rollup on the right of the same row. */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">My Courses</h1>

        {!board.isLoading && !board.error && (
          <div className="grid grid-cols-4 gap-6 rounded-xl border border-[var(--border-subtle)] bg-white px-5 py-4 shadow-card">
            <Stat label="Courses" value={board.totals.courses} tone="platform" />
            <Stat label="Classes" value={board.totals.classes} />
            <Stat label="Students" value={board.totals.students} />
            <Stat
              label="Pending grading"
              value={board.totals.pendingGrading}
              tone={board.totals.pendingGrading > 0 ? "warning" : "success"}
            />
          </div>
        )}
      </div>

      <StateBoundary
        isLoading={board.isLoading}
        error={board.error}
        onRetry={board.refetch}
        isEmpty={board.entries.length === 0}
        emptyFallback={
          <EmptyState
            icon="📚"
            title="No courses assigned yet"
            description="Your IT Admin hasn't added you to any course. Once they invite you to one, it appears here and you can create class sections inside it."
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
          {board.entries.map((entry, idx) => (
            <Link
              key={entry.course.id}
              href={`/teacher/courses/${entry.course.id}`}
              className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
            >
              <CardLink
                className="flex h-full flex-col p-5 animate-fade-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <GenericPill tone="info">{entry.course.code}</GenericPill>
                  {entry.pendingGrading > 0 && (
                    <GenericPill tone="warning">
                      {entry.pendingGrading} to grade
                    </GenericPill>
                  )}
                </div>

                <h2 className="mt-2 text-base font-semibold text-[var(--text-strong)]">
                  {entry.course.title}
                </h2>
                {entry.course.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                    {entry.course.description}
                  </p>
                )}

                <div className="mt-auto flex gap-6 pt-5">
                  <Stat label="Classes" value={entry.classes.length} />
                  <Stat label="Students" value={entry.studentCount} />
                </div>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-platform">
                  {entry.classes.length === 0 ? "Create first class" : "Open course"}
                  <span aria-hidden="true">→</span>
                </span>
              </CardLink>
            </Link>
          ))}
        </div>
      </StateBoundary>
    </div>
  );
}
