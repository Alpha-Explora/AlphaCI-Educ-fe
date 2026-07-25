// MODEL LAYER — Users resource
import { apiRequest } from "./client";
import type { AssignmentRepository, SystemUser, UserRole } from "../types";

export const usersApi = {
  list(filters?: { role?: UserRole; classId?: string; orgId?: string }) {
    return apiRequest<SystemUser[]>("/users", { query: filters });
  },

  get(id: string) {
    return apiRequest<SystemUser>(`/users/${id}`);
  },

  repositories(id: string) {
    return apiRequest<AssignmentRepository[]>(`/users/${id}/repositories`);
  },
};
