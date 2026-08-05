"use client";
// ============================================================================
// VIEW LAYER — the course shortlist on teacher Home.
//
// ROWS, NOT A CARD GRID. This started as the same CourseCard used on the Courses
// page, two to a row. Three courses therefore wrapped onto a second row of tall
// cards and pushed Home past the fold — a shortlist that makes the page longer
// than the thing it is summarising has stopped being a shortlist.
//
// Rows also match the timetable directly above, which matters more than it
// sounds: the two sections answer different questions ("what's next", "what do I
// teach") and reading as one continuous list is what keeps Home a single glance
// rather than two competing layouts stacked on each other.
//
// The full card, with its texture and per-lab footnotes, still lives on
// /teacher/courses where there is room for it. Nothing here duplicates that — a
// row carries only what decides which course to open.
// ============================================================================
import Link from "next/link";
import { Card, GenericPill } from "@/components/ui";
import type { CourseBoardEntry } from "@/viewmodels/useTeacherCourseBoard";

export function QuickCourses({ entries }: { readonly entries: CourseBoardEntry[] }) {
  return (
    <Card className="divide-y divide-[var(--border-subtle)] overflow-hidden p-0">
      {entries.map((entry) => (
        <CourseRow key={entry.course.id} entry={entry} />
      ))}
    </Card>
  );
}

function CourseRow({ entry }: { readonly entry: CourseBoardEntry }) {
  const { course, classes, studentCount, pendingGrading } = entry;

  return (
    <Link
      href={`/teacher/courses/${course.id}`}
      className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-platform"
    >
      {/* The code in the same chip the section rows use, so a teacher's eye
          tracks one column down the whole page. */}
      <span className="w-24 shrink-0">
        <span className="inline-block rounded-full bg-platform-600 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-white shadow-sm">
          {course.code}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[var(--text-strong)]">{course.title}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {classes.length} {classes.length === 1 ? "class" : "classes"} ·{" "}
          {studentCount} {studentCount === 1 ? "student" : "students"}
        </p>
      </div>

      {/* Only when there IS something waiting. A "0 to grade" badge on every row
          is noise that trains a teacher to stop reading the column. */}
      {pendingGrading > 0 && (
        <GenericPill tone="warning">{pendingGrading} to grade</GenericPill>
      )}

      <span
        aria-hidden="true"
        className="shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
