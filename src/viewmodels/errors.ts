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
}

export function toPresentableError(error: unknown): PresentableError {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      isNetworkError: error.isNetworkError,
      baseUrl: error.baseUrl,
      status: error.status,
    };
  }
  return {
    message: error instanceof Error ? error.message : "Something went wrong.",
    isNetworkError: false,
    baseUrl: API_BASE_URL,
    status: null,
  };
}
