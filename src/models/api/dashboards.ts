// MODEL LAYER — Dashboards resource
import { apiRequest } from "./client";
import type { StudentDashboard, TeacherDashboard } from "../types";

export const dashboardsApi = {
  // ADDENDUM K — `orgId` scopes the dashboard to the teacher's selected lab.
  teacher(id: string, orgId?: string) {
    return apiRequest<TeacherDashboard>(`/teachers/${id}/dashboard`, {
      query: { orgId },
    });
  },

  student(id: string) {
    return apiRequest<StudentDashboard>(`/students/${id}/dashboard`);
  },
};
