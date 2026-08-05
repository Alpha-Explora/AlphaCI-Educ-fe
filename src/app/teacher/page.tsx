"use client";
// ============================================================================
// VIEW LAYER — Teacher Home: what am I teaching next, and can I start it.
//
// IT IS A SCHEDULE NOW, NOT A COURSE CATALOGUE. Home used to open on a grid of
// course cards, which meant the first thing a teacher saw on walking into a
// laboratory was the one object that cannot tell them what is about to happen —
// a course does not start, end, or occur at a time. Sections do. The courses are
// still one click away in the rail, where a catalogue belongs.
//
// TWO COLUMNS, and the split is by question rather than by size. The wide column
// answers "what's next"; the rail answers "where do things stand, and can I start
// the class". Class access sits UNDER the totals rather than across the top: as a
// full-width banner it dominated a page whose actual subject is the timetable
// below it, and a teacher between classes was being shouted at by a control they
// only need twice a day.
//
// Derivation lives in the ViewModels — useTeacherSchedule for the timetable,
// useTeacherCourseBoard for the rollup. Both read the same two queries, so
// holding both costs no extra request.
// ============================================================================
import { useMemo } from "react";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherCourseBoard } from "@/viewmodels/useTeacherCourseBoard";
import { useTeacherSchedule } from "@/viewmodels/useTeacherSchedule";
import { EmptyState, Skeleton, Stat, StateBoundary } from "@/components/ui";
import { ClassAccessCard } from "@/components/domain/ClassAccessCard";
import { UpcomingClasses } from "@/components/domain/UpcomingClasses";

export default function TeacherDashboardPage() {
  const { user, selectedOrgId } = useSession();
  const board = useTeacherCourseBoard(user?.id ?? null, selectedOrgId);
  const schedule = useTeacherSchedule(user?.id ?? null, selectedOrgId);

  /*
    Every section this teacher runs in this lab, for the access card's own
    detection. Taken from the schedule rows because that list is already the
    complete one — including sections whose course belongs to another lab, which
    the course board files separately and which a teacher must still be able to
    start.
  */
  const allClasses = useMemo(
    () => schedule.rows.map((row) => row.classInfo),
    [schedule.rows],
  );

  /*
    A 2:1 split via named tracks, NOT `grid-cols-[minmax(0,1fr)_24rem]`.
    Tailwind's class extractor drops that arbitrary value on the floor — the
    comma inside minmax() defeats it — so the utility compiles to no rule at all
    and the page silently collapses to one stacked column on desktop. Verified
    against the built CSS, not by reading the class name.

    `min-w-0` on the wide column because a grid track's default `min-width: auto`
    lets long content push the track wider than its share, which is the thing
    minmax(0,…) would have prevented.
  */
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      {/* ---------------------------------------------------------------- */}
      {/* What's next                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="min-w-0 space-y-5 lg:col-span-2">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            My Schedule
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Your sections, soonest first. Open one to see its students and work.
          </p>
        </div>

        <StateBoundary
          isLoading={schedule.isLoading}
          error={schedule.error}
          onRetry={schedule.refetch}
          isEmpty={schedule.rows.length === 0}
          emptyFallback={
            <EmptyState
              icon="🗓️"
              title="Nothing scheduled yet"
              description="Once you create a class section inside one of your courses, it appears here with its meeting hours."
            />
          }
          loadingFallback={<Skeleton className="h-64 w-full rounded-xl" />}
        >
          <div className="animate-fade-up">
            <UpcomingClasses rows={schedule.rows} />
          </div>
        </StateBoundary>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Where things stand, and the one action                            */}
      {/* ---------------------------------------------------------------- */}
      <aside className="space-y-6 lg:sticky lg:top-6">
        {!board.isLoading && !board.error && (
          <div className="grid grid-cols-2 gap-5 rounded-xl border border-[var(--border-subtle)] bg-white px-5 py-4 shadow-card animate-fade-up">
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

        <ClassAccessCard classes={allClasses} />
      </aside>
    </div>
  );
}
