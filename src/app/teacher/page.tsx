"use client";
// ============================================================================
// VIEW LAYER — Teacher dashboard (ADDENDUM H — course-centric)
// Courses are the top level: each course an IT Admin assigned this teacher gets
// one card here. The class sections the teacher created under a course live on
// that course's own page (/teacher/courses/[id]), where they are also created.
// Data/derivation live in the ViewModels (useTeacherCourseBoard).
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherCourseBoard } from "@/viewmodels/useTeacherCourseBoard";
import {
  Button,
  CardLink,
  EmptyState,
  SkeletonCard,
  Stat,
  StateBoundary,
  GenericPill,
} from "@/components/ui";
import { CreateClassModal } from "@/components/domain/CreateClassModal";

export default function TeacherDashboardPage() {
  const { user, selectedOrgId } = useSession();
  const board = useTeacherCourseBoard(user?.id ?? null, selectedOrgId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-8">
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

                {/* Some of the sections counted above run in this lab but belong
                    to another lab's copy of the course. Say so on the card, so
                    the count and the section list agree once opened. */}
                {(() => {
                  const shared = entry.classes.filter((c) => c.sharedFromLabName);
                  if (shared.length === 0) return null;
                  const labNames = [
                    ...new Set(shared.map((c) => c.sharedFromLabName as string)),
                  ];
                  return (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Includes {shared.length}{" "}
                      {shared.length === 1 ? "section" : "sections"} from{" "}
                      {labNames.join(", ")}
                    </p>
                  );
                })()}

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-platform">
                  {entry.classes.length === 0 ? "Create first class" : "Open course"}
                  <span aria-hidden="true">→</span>
                </span>
              </CardLink>
            </Link>
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
              <Link
                key={c.id}
                href={`/teacher/classes/${c.id}`}
                className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
              >
                <CardLink
                  className="flex h-full flex-col p-5 animate-fade-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <GenericPill tone="info">Section {c.section}</GenericPill>
                    {c.pendingGrading > 0 && (
                      <GenericPill tone="warning">{c.pendingGrading} to grade</GenericPill>
                    )}
                  </div>

                  <h3 className="mt-1 text-base font-semibold text-[var(--text-strong)]">
                    {c.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{c.term}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    From <span className="font-medium">{owningLabName}</span>
                  </p>

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
