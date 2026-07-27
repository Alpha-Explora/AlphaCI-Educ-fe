// MODEL LAYER — Platform (SUPER_ADMIN) resource
import { apiRequest } from "./client";
import type { PlatformOverview } from "../types";

export const platformApi = {
  /**
   * Every laboratory, every account, every failing pipeline. SUPER_ADMIN only —
   * the backend rejects any other role with 403 before reading any data.
   */
  overview() {
    return apiRequest<PlatformOverview>("/platform/overview");
  },
};
