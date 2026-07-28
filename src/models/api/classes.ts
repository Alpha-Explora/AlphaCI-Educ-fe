// MODEL LAYER — Classes resource
import { apiRequest } from "./client";
import type {
  Assignment,
  ClassCohort,
  ClassRoster,
  CreateAssignmentResult,
  CreateClassInput,
  CreateProjectInput,
  JoinClassResult,
  JoinCode,
  JoinCodeInfo,
  JoinCodeToggleResult,
} from "../types";

export const classesApi = {
  list(filters?: { teacherId?: string; studentId?: string; orgId?: string }) {
    return apiRequest<ClassCohort[]>("/classes", { query: filters });
  },

  get(id: string) {
    return apiRequest<ClassCohort>(`/classes/${id}`);
  },

  // ADDENDUM E — teacher creates a class. The backend auto-generates the
  // magicJoinCode and enrolls the creating teacher. 400 on blank/duplicate.
  create(input: CreateClassInput) {
    return apiRequest<ClassCohort>("/classes", {
      method: "POST",
      body: input,
    });
  },

  // Teacher-of-class (or admin) deletes a section. Cascades: its projects,
  // their repositories and submitted work, and every enrolment. Student
  // ACCOUNTS survive. 403 if it isn't your section.
  remove(id: string) {
    return apiRequest<{
      deleted: boolean;
      classId: string;
      assignmentsRemoved: number;
      reposRemoved: number;
      studentsUnenrolled: number;
      githubReposDeleted: number;
    }>(`/classes/${id}`, { method: "DELETE" });
  },

  // Teacher-of-class (or admin) changes which laboratories a section meets in,
  // mid-term. Replaces the whole list; [] clears it. Repositories don't move —
  // they stay in the lab that owns the course. 403 if it isn't your section.
  setMeetingLabs(id: string, meetingLabOrgIds: string[]) {
    return apiRequest<ClassCohort>(`/classes/${id}/meeting-labs`, {
      method: "PATCH",
      body: { meetingLabOrgIds },
    });
  },

  roster(id: string) {
    return apiRequest<ClassRoster>(`/classes/${id}/roster`);
  },

  assignments(id: string) {
    return apiRequest<Assignment[]>(`/classes/${id}/assignments`);
  },

  // ADDENDUM C — create a SOLO or GROUP project. Creates the assignment plus
  // the per-student / per-group repository records; provisioning (ADDENDUM B)
  // then pushes the real GitHub repos.
  createAssignment(id: string, input: CreateProjectInput) {
    return apiRequest<CreateAssignmentResult>(`/classes/${id}/assignments`, {
      method: "POST",
      body: input,
    });
  },

  // --- ADDENDUM D — magic join code (whiteboard flow) ----------------------

  // Teacher: read the current join code for their class.
  getJoinCode(id: string) {
    return apiRequest<JoinCodeInfo>(`/classes/${id}/join-code`);
  },

  // Teacher: mint a new code — invalidates the previous one immediately.
  regenerateJoinCode(id: string) {
    return apiRequest<JoinCode>(`/classes/${id}/join-code/regenerate`, {
      method: "POST",
    });
  },

  // Teacher: enable/disable joining without changing the code.
  toggleJoinCode(id: string, active: boolean) {
    return apiRequest<JoinCodeToggleResult>(`/classes/${id}/join-code/toggle`, {
      method: "POST",
      body: { active },
    });
  },

  // Student: join a class by code. 404 unknown, 410 inactive/expired,
  // idempotent when already enrolled (alreadyEnrolled: true).
  join(code: string) {
    return apiRequest<JoinClassResult>("/classes/join", {
      method: "POST",
      body: { code },
    });
  },

  // All classes a student is enrolled in (multi-class hub).
  studentClasses(studentId: string) {
    return apiRequest<ClassCohort[]>(`/students/${studentId}/classes`);
  },
};
