"use client";
// ============================================================================
// VIEW LAYER — Teacher dashboard (ADDENDUM H — course-centric)
// Courses are the top level: each course an IT Admin assigned this teacher gets
// one card here. The class sections the teacher created under a course live on
// that course's own page (/teacher/courses/[id]), where they are also created.
// Data/derivation live in the ViewModels (useTeacherCourseBoard).
// ============================================================================
import { useMemo, useState } from "react";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherCourseBoard } from "@/viewmodels/useTeacherCourseBoard";
import {
  Button,
  EmptyState,
  SkeletonCard,
  Stat,
  StateBoundary,
} from "@/components/ui";
import { CreateClassModal } from "@/components/domain/CreateClassModal";
import { CourseCard } from "@/components/domain/CourseCard";
import { ClassCard } from "@/components/domain/ClassCard";
import { ClassAccessCard } from "@/components/domain/ClassAccessCard";

export default function TeacherDashboardPage() {
  const { user, selectedOrgId } = useSession();
  const board = useTeacherCourseBoard(user?.id ?? null, selectedOrgId);
  const [createOpen, setCreateOpen] = useState(false);

  /*
    Every section this teacher runs in this lab, flattened for the access-code
    picker. Both halves are needed: `entries` holds the sections filed under a
    course, and `sharedClasses` the ones whose course belongs to another lab and
    so has no card here. A section missing from this list is a class the teacher
    cannot start — which would be indistinguishable from the feature being
    broken. They cannot overlap (a shared section is only an "orphan" when no
    course claimed its code), so no de-duplication is needed.
  */
  const allClasses = useMemo(
    () => [
      ...board.entries.flatMap((entry) => entry.classes.map((c) => c.classInfo)),
      ...board.sharedClasses.map((s) => s.classInfo),
    ],
    [board.entries, board.sharedClasses],
  );

  return (
    <div className="space-y-8">
      {/*
        FIRST on the page, above the courses. Starting the class is the action
        that unblocks the entire room — until the code is up, every student is
        looking at a locked screen — so it goes where the teacher's eye lands,
        not below a grid of course cards.
      */}
      <ClassAccessCard classes={allClasses} />

      {/* Title on the left, summary rollup on the right of the same row. */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">My Courses</h1>
          {/* Unscoped create: the one place a teacher can pick a laboratory and
              build a section in a lab other than the one they're viewing. The
              per-course button on a course page stays scoped to that course. */}
          <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
            <span aria-hidden="true">＋</span> Create class
          </Button>
        </div>

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
        // A teacher can have NO course in this lab and still run a section that
        // merely meets here — that isn't an empty dashboard.
        isEmpty={board.entries.length === 0 && board.sharedClasses.length === 0}
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
        {/* The card itself — light-blue wash, per-course texture, shared-lab
            footnote — lives in CourseCard so the dashboard stays layout. */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {board.entries.map((entry, idx) => (
            <CourseCard key={entry.course.id} entry={entry} index={idx} />
          ))}
        </div>
      </StateBoundary>

      {/*
        The leftovers: sections meeting here whose course code matches NOTHING
        in this lab's catalog, so there is no card above to fold them into.
        Anything that did match now sits inside its course card instead — two
        entries for one subject read as a duplicate, which is what this block
        used to look like.
      */}
      {board.sharedClasses.length > 0 && (
        <section className="space-y-4 animate-fade-up">
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              Also meeting here
            </h2>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Sections you run in this laboratory whose course isn&apos;t in this
              laboratory&apos;s catalogue at all.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {board.sharedClasses.map(({ classInfo: c, owningLabName }, idx) => (
              <ClassCard
                key={c.id}
                classInfo={c}
                fromLabName={owningLabName}
                index={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* Mount on open so the lab/course pickers initialise from freshly
          loaded courses rather than a stale first render. */}
      {createOpen && (
        <CreateClassModal open onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
