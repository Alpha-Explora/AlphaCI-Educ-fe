"use client";
// ============================================================================
// VIEW LAYER — Teacher Home: what am I teaching next, and can I start it.
//
// IT IS A SCHEDULE NOW, NOT A COURSE CATALOGUE. Home used to open on a grid of
// course cards, which meant the first thing a teacher saw on walking into a
// laboratory was the one object that cannot tell them what is about to happen —
// a course does not start, end, or occur at a time. Sections do.
//
// Courses did not disappear, they moved DOWN. A shortlist under the timetable
// keeps the common jump ("open Programming 1") one click away without letting a
// catalogue that grows every term take the top of the page again.
//
// EVERYTHING HERE IS A SHORTLIST, and both caps are visible rather than silent:
// five sections and four courses, each with a link to the page that holds the
// rest. A truncated list with no way to reach the remainder is how a teacher
// concludes a section has vanished.
//
// The heading sits ABOVE the grid rather than inside its left column, so the
// rail's first card lines up with the timetable instead of with the page title —
// a box whose top edge matched the h1 made the two read as one row that was not.
//
// Derivation lives in the ViewModels — useTeacherSchedule for the timetable,
// useTeacherCourseBoard for the courses and the rollup. Both read the same two
// queries, so holding both costs no extra request.
// ============================================================================
import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherCourseBoard } from "@/viewmodels/useTeacherCourseBoard";
import { useTeacherSchedule } from "@/viewmodels/useTeacherSchedule";
import { EmptyState, Skeleton, Stat, StateBoundary } from "@/components/ui";
import { ClassAccessCard } from "@/components/domain/ClassAccessCard";
import { QuickCourses } from "@/components/domain/QuickCourses";
import { UpcomingClasses } from "@/components/domain/UpcomingClasses";

/** Sections shown before deferring to the Schedule tab. */
const SCHEDULE_PREVIEW = 5;
/** Courses shown before deferring to the Courses page. Four compact rows. */
const COURSE_PREVIEW = 4;

/** A Link that reads as a secondary button. Mirrors PageHeader's own back link. */
const LINK_BUTTON =
  "inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] " +
  "bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] " +
  "shadow-card transition-colors hover:border-platform/40 hover:bg-platform-50 " +
  "hover:text-platform-800 focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-platform";

export default function TeacherDashboardPage() {
  const { user, selectedOrgId } = useSession();
  const board = useTeacherCourseBoard(user?.id ?? null, selectedOrgId);
  const schedule = useTeacherSchedule(user?.id ?? null, selectedOrgId);

  /*
    Every section this teacher runs in this lab, for the access card's own
    detection — the FULL list, not the preview. The card picks the section
    meeting now, and that section is regularly not in the first five.
  */
  const allClasses = useMemo(
    () => schedule.rows.map((row) => row.classInfo),
    [schedule.rows],
  );

  const shownRows = schedule.rows.slice(0, SCHEDULE_PREVIEW);
  const hiddenRows = schedule.rows.length - shownRows.length;
  const shownCourses = board.entries.slice(0, COURSE_PREVIEW);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">My Schedule</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Your sections, soonest first. Open one to see its students and work.
        </p>
      </div>

      {/*
        `min-w-0` on the wide column because a grid track's default
        `min-width: auto` lets long content push the track wider than its share.

        Named tracks, NOT `grid-cols-[minmax(0,1fr)_24rem]`: Tailwind's class
        extractor drops that arbitrary value — the comma inside minmax() defeats
        it — so it compiles to no rule at all and the page silently collapses to
        one stacked column. Verified against the built CSS, not the class name.
      */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="min-w-0 space-y-8 lg:col-span-2">
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
            <div className="space-y-3 animate-fade-up">
              <UpcomingClasses rows={shownRows} />
              {/* The cap, said out loud. A list that quietly stops at five is
                  indistinguishable from a section having disappeared. */}
              {hiddenRows > 0 && (
                <Link
                  href="/teacher/schedule"
                  className="inline-flex text-sm font-medium text-platform underline underline-offset-2 hover:text-platform-700"
                >
                  {hiddenRows} more {hiddenRows === 1 ? "section" : "sections"} — view
                  full schedule →
                </Link>
              )}
            </div>
          </StateBoundary>

          {/* Courses, below the timetable and shortlisted. */}
          {!board.isLoading && !board.error && shownCourses.length > 0 && (
            <section className="space-y-4 animate-fade-up">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                  Quick courses
                </h2>
                <Link href="/teacher/courses" className={LINK_BUTTON}>
                  View all courses
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <QuickCourses entries={shownCourses} />
            </section>
          )}
        </div>

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
    </div>
  );
}
