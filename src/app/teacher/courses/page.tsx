"use client";
// VIEW LAYER — Teacher: the courses an IT Admin assigned this teacher in the
// ACTIVE lab. Class sections live under each course on the Dashboard.
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherCourses } from "@/viewmodels/useTeacherCourses";
import {
  Card,
  EmptyState,
  GenericPill,
  SkeletonCard,
  StateBoundary,
} from "@/components/ui";

export default function TeacherCoursesPage() {
  const { user, labs, selectedOrgId } = useSession();
  const vm = useTeacherCourses(user?.id ?? null, selectedOrgId);
  const activeLab = labs.find((l) => l.id === selectedOrgId) ?? null;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Courses</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Courses assigned to you in{" "}
          <strong>{activeLab?.name ?? "your laboratory"}</strong>. Open a course to create
          and manage its class sections.
        </p>
      </div>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        isEmpty={vm.courses.length === 0}
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vm.courses.map((course, idx) => (
            <Card
              key={course.id}
              className="flex h-full flex-col p-5 animate-fade-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <GenericPill tone="info">{course.code}</GenericPill>
              <h2 className="mt-2 text-base font-semibold text-[var(--text-strong)]">
                {course.title}
              </h2>
              {course.description && (
                <p className="mt-1 line-clamp-3 text-sm text-[var(--text-muted)]">
                  {course.description}
                </p>
              )}
              <Link
                href={`/teacher/courses/${course.id}`}
                className="mt-auto pt-4 text-sm font-medium text-platform hover:underline"
              >
                Open class sections →
              </Link>
            </Card>
          ))}
        </div>
      </StateBoundary>
    </div>
  );
}
