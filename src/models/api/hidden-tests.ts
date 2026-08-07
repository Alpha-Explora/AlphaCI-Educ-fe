// MODEL LAYER — Hidden tests resource.
//
// Two endpoints return different things on purpose: `summary` is metadata a
// teacher can glance at, `content` is the actual test source. They are separate
// so that fetching the suite is always a deliberate act — a single endpoint
// returning "summary plus files when you're staff" is how test source ends up
// in a response nobody audited.
import { apiRequest } from "./client";
import type {
  HiddenTestSuite,
  HiddenTestSuiteSummary,
  UploadHiddenTestsInput,
} from "../types";

export const hiddenTestsApi = {
  /**
   * Metadata only. Resolves to null when the teacher has not uploaded a suite.
   *
   * The `?? null` is load-bearing. Nest returns `null` from the handler, which
   * goes out as an EMPTY body, and the client turns an empty body into
   * `undefined` — which React Query v5 rejects outright with "Query data cannot
   * be undefined". Normalising here keeps that quirk from reaching every caller.
   */
  async summary(assignmentId: string): Promise<HiddenTestSuiteSummary | null> {
    const result = await apiRequest<HiddenTestSuiteSummary | null>(
      `/assignments/${assignmentId}/hidden-tests`,
    );
    return result ?? null;
  },

  /** The test source, for the teacher of this assignment's class. */
  content(assignmentId: string) {
    return apiRequest<HiddenTestSuite>(
      `/assignments/${assignmentId}/hidden-tests/content`,
    );
  },

  /** Replaces the suite entirely and bumps its version. */
  upload(assignmentId: string, input: UploadHiddenTestsInput) {
    return apiRequest<HiddenTestSuiteSummary>(
      `/assignments/${assignmentId}/hidden-tests`,
      // The object, not a string — `apiRequest` stringifies. See the note on
      // assignmentsApi.setGradesReleased: double-stringifying produces a
      // top-level JSON string, which the server's strict parser refuses.
      { method: "POST", body: input },
    );
  },

  remove(assignmentId: string) {
    return apiRequest<{ removed: boolean }>(
      `/assignments/${assignmentId}/hidden-tests`,
      { method: "DELETE" },
    );
  },
};

