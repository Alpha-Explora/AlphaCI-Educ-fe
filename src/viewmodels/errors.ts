// VIEWMODEL LAYER — error presentation helper.
// Normalizes any thrown error into a small shape Views can render directly.
import { ApiError, API_BASE_URL } from "@/models/api";

export interface PresentableError {
  message: string;
  isNetworkError: boolean;
  baseUrl: string;
}

export function toPresentableError(error: unknown): PresentableError {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      isNetworkError: error.isNetworkError,
      baseUrl: error.baseUrl,
    };
  }
  return {
    message: error instanceof Error ? error.message : "Something went wrong.",
    isNetworkError: false,
    baseUrl: API_BASE_URL,
  };
}
