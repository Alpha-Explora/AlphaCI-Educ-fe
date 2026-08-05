// MODEL LAYER — Class access ("the code on the board").
//
// Two audiences on one resource. The teacher opens and closes a class and reads
// the code; the student spends it. Kept in one module because they are two halves
// of the same handshake — splitting them would let the request shapes drift.
//
// Distinct from classesApi's join-code calls, which are about ENROLMENT. See the
// note above ClassAccessStatus in ../types.
import { apiRequest } from "./client";
import type {
  ClassAccessEndResult,
  ClassAccessStatus,
  StudentAccessStatus,
} from "../types";

export const classAccessApi = {
  // --- Student ---

  /** Am I past the gate? Also the shape the gate screen polls after a failure. */
  me() {
    return apiRequest<StudentAccessStatus>("/class-access/me");
  },

  /**
   * Spend the code. 404 when it matches no open class — which deliberately
   * covers both a typo and a class that has ended, since the student's next
   * action ("check the board") is the same either way.
   */
  redeem(code: string) {
    return apiRequest<StudentAccessStatus>("/class-access/redeem", {
      method: "POST",
      body: { code },
    });
  },

  // --- Teacher (and IT admin) ---

  status(classId: string) {
    return apiRequest<ClassAccessStatus>(`/class-access/classes/${classId}`);
  },

  /** Start the class. Idempotent — returns the code already running, if any. */
  open(classId: string) {
    return apiRequest<ClassAccessStatus>(`/class-access/classes/${classId}/open`, {
      method: "POST",
    });
  },

  /** New code, nobody ejected. For a code that has spread beyond the room. */
  rotate(classId: string) {
    return apiRequest<ClassAccessStatus>(`/class-access/classes/${classId}/rotate`, {
      method: "POST",
    });
  },

  /** End the class: the code stops working and every student is turned out. */
  end(classId: string) {
    return apiRequest<ClassAccessEndResult>(`/class-access/classes/${classId}/end`, {
      method: "POST",
    });
  },
};
