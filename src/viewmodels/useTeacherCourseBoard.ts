"use client";
// VIEWMODEL LAYER — the teacher's course board (ADDENDUM H).
// Joins the courses an IT Admin assigned this teacher with the class sections
// the teacher created under each one. The Dashboard renders the course cards
// and /teacher/courses/[id] renders one course's classes — both read this same
// join, so the per-course counts can never drift between the two screens.
import { useMemo } from "react";
import { useSession } from "./useSession";
import { useTeacherCourses } from "./useTeacherCourses";
import { useTeacherDashboard } from "./useTeacherDashboard";
import type { Course, TeacherDashboard } from "@/models/types";
import type { PresentableError } from "./errors";

export type TeacherClass = TeacherDashboard["classes"][number];

/** One section on the board, plus where it came from if it isn't from here. */
export interface BoardClass {
  classInfo: TeacherClass;
  /**
   * The lab that owns this section's course — and stores its repositories —
   * when that is NOT the lab being viewed. null for the ordinary case.
   */
  sharedFromLabName: string | null;
}

export interface CourseBoardEntry {
  course: Course;
  /** "IS-1234 — Programming 1", the label the create-class modal expects. */
  label: string;
  classes: BoardClass[];
  studentCount: number;
  pendingGrading: number;
}

/** A section that meets in the current lab but is owned by another one. */
export interface SharedClassEntry {
  classInfo: TeacherClass;
  /** The lab that owns its course — and stores its repositories. */
  owningLabName: string;
}

export interface TeacherCourseBoardVM {
  entries: CourseBoardEntry[];
  /**
   * Shared sections that could NOT be filed under a course in this lab, because
   * this lab's catalog has nothing with that course code. Anything that DOES
   * match sits inside its course entry instead — a teacher reads "Programming 1
   * in Lab 1" and "Programming 1 in Lab 2" as one course, so splitting them into
   * two places on the page just looked like a duplicate.
   */
  sharedClasses: SharedClassEntry[];
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
  const { labs } = useSession();

  const { courses } = coursesVm;
  const classes = dash.data?.classes;

  /*
    Two kinds of section come back for a lab:

      - OWNED   — its course lives here; filed under that course by courseId.
      - SHARED  — its course lives in another lab and it merely meets here.

    Each lab keeps its own course record, so a shared section's courseId will
    never match a local course even when it is plainly the same subject. Filing
    those by COURSE CODE instead is what puts "Programming 1 from Lab 2" inside
    the Programming 1 card rather than in a second list further down the page.

    Matching on code is a presentation choice, not a claim that the two course
    records are one row — hence the origin badge on every shared section. A
    shared section whose code has no local course still has nowhere to sit, so
    it falls through to `sharedClasses`.
  */
  const { entries, sharedClasses } = useMemo(() => {
    const ownedByCourseId = new Map<string, TeacherClass[]>();
    const sharedByCode = new Map<string, TeacherClass[]>();

    for (const c of classes ?? []) {
      const isShared = Boolean(orgId) && c.orgId !== orgId;
      const key = isShared ? c.code.trim().toUpperCase() : c.courseId;
      const bucket = isShared ? sharedByCode : ownedByCourseId;
      const list = bucket.get(key) ?? [];
      list.push(c);
      bucket.set(key, list);
    }

    const labNameOf = (id: string) =>
      labs.find((l) => l.id === id)?.name ?? "another laboratory";

    const claimedCodes = new Set<string>();
    const built = courses.map((course) => {
      const code = course.code.trim().toUpperCase();
      const shared = sharedByCode.get(code) ?? [];
      if (shared.length > 0) claimedCodes.add(code);

      const courseClasses: BoardClass[] = [
        ...(ownedByCourseId.get(course.id) ?? []).map((classInfo) => ({
          classInfo,
          sharedFromLabName: null,
        })),
        ...shared.map((classInfo) => ({
          classInfo,
          sharedFromLabName: labNameOf(classInfo.orgId),
        })),
      ];

      return {
        course,
        label: `${course.code} — ${course.title}`,
        classes: courseClasses,
        // Counts cover everything shown under the card. A card reading
        // "0 classes" above a listed section would just look broken.
        studentCount: courseClasses.reduce((s, c) => s + c.classInfo.studentCount, 0),
        pendingGrading: courseClasses.reduce((s, c) => s + c.classInfo.pendingGrading, 0),
      };
    });

    const orphans: SharedClassEntry[] = [...sharedByCode.entries()]
      .filter(([code]) => !claimedCodes.has(code))
      .flatMap(([, list]) =>
        list.map((classInfo) => ({
          classInfo,
          owningLabName: labNameOf(classInfo.orgId),
        })),
      );

    return { entries: built, sharedClasses: orphans };
  }, [courses, classes, labs, orgId]);

  return {
    entries,
    sharedClasses,
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
