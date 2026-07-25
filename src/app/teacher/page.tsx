"use client";
// ============================================================================
// VIEW LAYER — Teacher dashboard (ADDENDUM H — course-centric)
// Courses are the top level: each course an IT Admin assigned this teacher is a
// section, and the classes the teacher created live UNDER their course. Classes
// are always created inside a course (the per-course "Create class" button),
// never standalone. Data/derivation live in the ViewModels.
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherDashboard } from "@/viewmodels/useTeacherDashboard";
import { useTeacherCourses } from "@/viewmodels/useTeacherCourses";
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
import type { TeacherDashboard } from "@/models/types";

type TeacherClass = TeacherDashboard["classes"][number];

export default function TeacherDashboardPage() {
  const { user, selectedOrgId } = useSession();
  const dash = useTeacherDashboard(user?.id ?? null, selectedOrgId);
  const coursesVm = useTeacherCourses(user?.id ?? null, selectedOrgId);
  const [createFor, setCreateFor] = useState<{ courseId: string; label: string } | null>(
    null,
  );

  const classes = dash.data?.classes ?? [];
  const classesByCourse = new Map<string, TeacherClass[]>();
  for (const c of classes) {
    const list = classesByCourse.get(c.courseId) ?? [];
    list.push(c);
    classesByCourse.set(c.courseId, list);
  }

  const isLoading = dash.isLoading || coursesVm.isLoading;
  const error = coursesVm.error ?? dash.error;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">My Courses</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Courses your IT Admin assigned you. Create class sections inside a course — you only
          see your own courses and classes, never other teachers&apos;.
        </p>
      </div>

      {/* Summary rollup */}
      {!isLoading && !error && dash.data && (
        <div className="grid grid-cols-4 gap-4 rounded-xl border border-[var(--border-subtle)] bg-white p-5 shadow-card animate-fade-up sm:max-w-2xl">
          <Stat label="Courses" value={coursesVm.courses.length} tone="platform" />
          <Stat label="Classes" value={dash.totals.classes} />
          <Stat label="Students" value={dash.totals.students} />
          <Stat
            label="Pending grading"
            value={dash.totals.pendingGrading}
            tone={dash.totals.pendingGrading > 0 ? "warning" : "success"}
          />
        </div>
      )}

      <StateBoundary
        isLoading={isLoading}
        error={error}
        onRetry={() => {
          dash.refetch();
          coursesVm.refetch();
        }}
        isEmpty={coursesVm.courses.length === 0}
        emptyFallback={
          <EmptyState
            icon="📚"
            title="No courses assigned yet"
            description="Your IT Admin hasn't added you to any course. Once they invite you to one, it appears here and you can create class sections under it."
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
        <div className="space-y-10">
          {coursesVm.courses.map((course) => {
            const courseClasses = classesByCourse.get(course.id) ?? [];
            const label = `${course.code} — ${course.title}`;
            return (
              <section key={course.id} className="animate-fade-up">
                {/* Course header */}
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-platform">
                        {course.code}
                      </p>
                      <GenericPill tone="info">
                        {courseClasses.length}{" "}
                        {courseClasses.length === 1 ? "class" : "classes"}
                      </GenericPill>
                    </div>
                    <h2 className="mt-0.5 text-lg font-semibold text-[var(--text-strong)]">
                      {course.title}
                    </h2>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setCreateFor({ courseId: course.id, label })}
                  >
                    <span aria-hidden="true">＋</span> Create class
                  </Button>
                </div>

                {/* Classes under this course */}
                {courseClasses.length === 0 ? (
                  <p className="mt-4 text-sm text-[var(--text-muted)]">
                    No classes yet. Use{" "}
                    <span className="font-medium text-[var(--text-strong)]">Create class</span>{" "}
                    to add your first section and get a join code for students.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {courseClasses.map((c, idx) => (
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
                            </div>
                            {c.pendingGrading > 0 && (
                              <GenericPill tone="warning">
                                {c.pendingGrading} to grade
                              </GenericPill>
                            )}
                          </div>

                          <p className="mt-1 truncate font-mono text-xs text-[var(--text-muted)]">
                            @{c.githubTeamSlug}
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
                )}
              </section>
            );
          })}
        </div>
      </StateBoundary>

      {/* Create class — always scoped to the course it was opened from */}
      {createFor && (
        <CreateClassModal
          open
          courseId={createFor.courseId}
          courseLabel={createFor.label}
          onClose={() => setCreateFor(null)}
        />
      )}
    </div>
  );
}
