// ============================================================================
// MODEL LAYER — Base HTTP client
// Thin typed wrapper over fetch. Reads NEXT_PUBLIC_API_BASE_URL. Normalizes
// errors so ViewModels can degrade gracefully when the backend is unreachable.
//
// Models never import Views or ViewModels.
// ============================================================================

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

const TOKEN_STORAGE_KEY = "alphaci.token";

/**
 * Normalized error surfaced to the ViewModel layer.
 * `kind: "network"` means the backend could not be reached at all — the UI
 * shows a "Backend not reachable" banner rather than crashing.
 * `kind: "http"` means the server responded with a non-2xx status.
 */
export class ApiError extends Error {
  readonly kind: "network" | "http";
  readonly status: number | null;
  readonly baseUrl: string;
  /**
   * Machine-readable cause, when the API chose to send one (`code` in the error
   * body). Most endpoints do not, so this is usually null.
   *
   * It exists because a status alone is often too coarse to act on. A 403 from
   * /auth/login can mean "wrong sign-in page", "account deactivated", or "these
   * credentials have no profile here" — three situations with three different
   * recoveries, and the only thing distinguishing them used to be the English
   * sentence. Branching UI on prose means a copy edit silently breaks a
   * behaviour, and nothing in the type system notices.
   */
  readonly code: string | null;

  constructor(
    message: string,
    kind: "network" | "http",
    status: number | null,
    baseUrl: string,
    code: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.baseUrl = baseUrl;
    this.code = code;
  }

  get isNetworkError() {
    return this.kind === "network";
  }
}

// --- Token persistence (mock SSO session token) ----------------------------
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Extra query params, appended when provided. */
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
}

function buildUrl(
  path: string,
  query?: RequestOptions["query"],
): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, signal } = options;
  const url = buildUrl(path, query);

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
      // ADDENDUM B — cross-origin (:3000 → :4000) session cookie MUST flow so
      // GitHub-authenticated teachers stay signed in. Applies to every request.
      credentials: "include",
    });
  } catch (err) {
    // fetch throws on network-level failure (server down, DNS, CORS blocked) and
    // on abort — including a caller's `AbortSignal.timeout`. Both mean "no answer
    // came back", which is what the network message already tells the user, so
    // they deliberately share a path.
    throw new ApiError(
      `Backend not reachable at ${API_BASE_URL}`,
      "network",
      null,
      API_BASE_URL,
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | null = null;
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") message = data.message;
      else if (Array.isArray(data?.message)) message = data.message.join(", ");
      // Optional and absent from most responses — see ApiError.code.
      if (data && typeof data.code === "string") code = data.code;
    } catch {
      /* body wasn't JSON — keep default message */
    }
    throw new ApiError(message, "http", res.status, API_BASE_URL, code);
  }

  // 204 / empty body handling
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
