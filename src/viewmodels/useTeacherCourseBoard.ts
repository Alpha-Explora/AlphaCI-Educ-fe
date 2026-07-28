"use client";
// VIEWMODEL LAYER — the teacher's course board (ADDENDUM H).
// Joins the courses an IT Admin assigned this teacher with the class sections
// the teacher created under each one. The Dashboard renders the course cards
// and /teacher/courses/[id] renders one course's classes — both read this same
// join, so the per-course counts can never drift between the two screens.
import { useMemo } from "react";
import { useTeacherCourses } from "./useTeacherCourses";
import { useTeacherDashboard } from "./useTeacherDashboard";
import type { Course, TeacherDashboard } from "@/models/types";
import type { PresentableError } from "./errors";

export type TeacherClass = TeacherDashboard["classes"][number];

export interface CourseBoardEntry {
  course: Course;
  /** "IS-1234 — Programming 1", the label the create-class modal expects. */
  label: string;
  classes: TeacherClass[];
  studentCount: number;
  pendingGrading: number;
}

export interface TeacherCourseBoardVM {
  entries: CourseBoardEntry[];
  /** One course by id, or null while loading / when it isn't assigned to this teacher. */
  entryFor: (courseId: string | null) => CourseBoardEntry | null;
  totals: {
    courses: number;
    classes: number;
    students: number;
    pendingGrading: number;
  };
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;
}

export function useTeacherCourseBoard(
  teacherId: string | null,
  orgId?: string | null,
): TeacherCourseBoardVM {
  const coursesVm = useTeacherCourses(teacherId, orgId);
  const dash = useTeacherDashboard(teacherId, orgId);

  const { courses } = coursesVm;
  const classes = dash.data?.classes;

  const entries = useMemo<CourseBoardEntry[]>(() => {
    const byCourse = new Map<string, TeacherClass[]>();
    for (const c of classes ?? []) {
      const list = byCourse.get(c.courseId) ?? [];
      list.push(c);
      byCourse.set(c.courseId, list);
    }
    return courses.map((course) => {
      const courseClasses = byCourse.get(course.id) ?? [];
      return {
        course,
        label: `${course.code} — ${course.title}`,
        classes: courseClasses,
        studentCount: courseClasses.reduce((sum, c) => sum + c.studentCount, 0),
        pendingGrading: courseClasses.reduce((sum, c) => sum + c.pendingGrading, 0),
      };
    });
  }, [courses, classes]);

  return {
    entries,
    entryFor: (courseId) =>
      courseId ? (entries.find((e) => e.course.id === courseId) ?? null) : null,
    totals: {
      courses: courses.length,
      classes: dash.totals.classes,
      students: dash.totals.students,
      pendingGrading: dash.totals.pendingGrading,
    },
    isLoading: coursesVm.isLoading || dash.isLoading,
    // Courses drive the page, so surface their failure first.
    error: coursesVm.error ?? dash.error,
    refetch: () => {
      coursesVm.refetch();
      dash.refetch();
    },
  };
}
