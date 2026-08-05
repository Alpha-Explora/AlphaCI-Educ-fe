// VIEWMODEL LAYER — error presentation helper.
// Normalizes any thrown error into a small shape Views can render directly.
import { ApiError, API_BASE_URL } from "@/models/api";

export interface PresentableError {
  message: string;
  isNetworkError: boolean;
  baseUrl: string;
  /**
   * HTTP status, when there was one. Kept so a View can react to the KIND of
   * failure — a 401 deserves a "Connect GitHub" link, a 409 a rename prompt —
   * rather than only ever printing the server's sentence back at the user.
   */
  status: number | null;
  /**
   * The server's machine-readable cause, when it sent one (`ApiError.code`).
   *
   * Carried through because a status alone is often not specific enough to act
   * on: several different 403s reach the same screen, and only the code tells
   * "you are outside the class-code gate" (CLASS_CODE_REQUIRED) apart from "that
   * isn't your section". Branch on this, never on `message` — the sentence is
   * copy and rewording it would silently break whatever depended on it.
   */
  code: string | null;
}

export function toPresentableError(error: unknown): PresentableError {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      isNetworkError: error.isNetworkError,
      baseUrl: error.baseUrl,
      status: error.status,
      code: error.code,
    };
  }
  return {
    message: error instanceof Error ? error.message : "Something went wrong.",
    isNetworkError: false,
    baseUrl: API_BASE_URL,
    status: null,
    code: null,
  };
}

/** True when this failure is the class-code gate refusing an un-admitted student. */
export function isClassCodeRequired(error: unknown): boolean {
  return error instanceof ApiError && error.code === "CLASS_CODE_REQUIRED";
}
