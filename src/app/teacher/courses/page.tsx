"use client";
// ============================================================================
// VIEW LAYER — Teacher: the courses an IT Admin assigned this teacher in the
// ACTIVE lab. Class sections live under each course on the Dashboard.
//
// Wears the same card as the dashboard (CourseCard) rather than a plain white
// panel of its own. Two screens showing the same OBJECT in two different
// costumes reads as two different kinds of thing — a teacher arriving here from
// Home should recognise her courses instantly, not re-learn them.
//
// It also reads the same ViewModel the dashboard reads (useTeacherCourseBoard,
// which wraps useTeacherCourses and joins the sections onto it). That is what
// lets the card carry its Classes/Students counts here at all, and it means the
// numbers on this page cannot drift from the numbers on Home — there is one
// join, not two.
// ============================================================================
import { useSession } from "@/viewmodels/useSession";
import { useTeacherCourseBoard } from "@/viewmodels/useTeacherCourseBoard";
import { EmptyState, SkeletonCard, Stat, StateBoundary } from "@/components/ui";
import { CourseCard } from "@/components/domain/CourseCard";

export default function TeacherCoursesPage() {
  const { user, labs, selectedOrgId } = useSession();
  const board = useTeacherCourseBoard(user?.id ?? null, selectedOrgId);
  const activeLab = labs.find((l) => l.id === selectedOrgId) ?? null;

  return (
    <div className="space-y-8">
      {/* Title and blurb on the left, the rollup on the right of the same row —
          the dashboard's header shape, so the two screens sit at the same
          altitude rather than one looking like a sub-page of the other. */}
      <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Courses</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Courses assigned to you in{" "}
            <strong>{activeLab?.name ?? "your laboratory"}</strong>. Open a course to create
            and manage its class sections.
          </p>
        </div>

        {/* Held back until the data lands: a rollup of four zeroes is a claim,
            and it would be the wrong one for the second it was on screen. */}
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
            description="Your IT Admin hasn't added you to any course in this lab. Once they do, it appears here."
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
        {/* Deliberately NOT rendering board.sharedClasses here. Those are
            sections meeting in this lab whose course belongs to another one —
            they are classes, not courses, and this page is the course
            catalogue. The dashboard is where they have a home. */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {board.entries.map((entry, idx) => (
            <CourseCard key={entry.course.id} entry={entry} index={idx} />
          ))}
        </div>
      </StateBoundary>
    </div>
  );
}
