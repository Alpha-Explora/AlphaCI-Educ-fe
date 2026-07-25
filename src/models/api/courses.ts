// MODEL LAYER — Courses resource (ADDENDUM H)
// IT Admin: create courses, invite instructors, view the managed catalog.
// Teacher: list the courses they were invited to (create-class picker).
import { apiRequest } from "./client";
import type {
  AddInstructorInput,
  Course,
  CourseInstructor,
  CourseWithInstructors,
  CreateCourseInput,
  SystemUser,
} from "../types";

export const coursesApi = {
  // Courses, optionally scoped. `teacherId` returns only courses that teacher
  // instructs — this is what the teacher's create-class course picker uses.
  list(filters?: { orgId?: string; teacherId?: string }) {
    return apiRequest<Course[]>("/courses", { query: filters });
  },

  // IT-Admin course-management view: each course + instructors + class count.
  managed(orgId: string) {
    return apiRequest<CourseWithInstructors[]>("/courses/managed", {
      query: { orgId },
    });
  },

  instructors(courseId: string) {
    return apiRequest<SystemUser[]>(`/courses/${courseId}/instructors`);
  },

  // IT Admin creates a catalog course. 400 on blank/duplicate code.
  create(input: CreateCourseInput) {
    return apiRequest<Course>("/courses", { method: "POST", body: input });
  },

  // IT Admin grants a teacher access (immediate). 400 non-teacher/cross-org,
  // 409 already an instructor.
  addInstructor(courseId: string, input: AddInstructorInput) {
    return apiRequest<CourseInstructor>(`/courses/${courseId}/instructors`, {
      method: "POST",
      body: input,
    });
  },

  // IT Admin deletes a course. 409 if it still has class sections.
  remove(courseId: string) {
    return apiRequest<{ deleted: boolean; courseId: string }>(`/courses/${courseId}`, {
      method: "DELETE",
    });
  },
};
