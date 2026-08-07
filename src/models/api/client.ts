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
  /**
   * The payload as a PLAIN OBJECT. This function stringifies it — do not pass
   * `JSON.stringify(...)`.
   *
   * Stated here because the mistake is silent at every layer that could catch
   * it. `unknown` accepts a string happily, the request is sent, and the server
   * receives valid JSON — just a top-level *string* instead of an object.
   * Express's parser is strict by default and admits only objects and arrays, so
   * it rejects the request before any handler runs, and what reaches the user is
   * a parser error about a token in a payload they never typed. Two call sites
   * had it (publishing marks, uploading hidden tests) and both looked correct.
   */
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

/**
 * GET a file as a Blob, authenticated, and hand it back for saving.
 *
 * WHY NOT JUST NAVIGATE TO THE URL. That was the previous approach —
 * `window.location.assign(url)` — and it 401s on any deployment where the frontend
 * and backend are different sites. This client authenticates with a BEARER TOKEN
 * from localStorage, and a browser navigation cannot carry an Authorization header;
 * it can only carry cookies. Locally that went unnoticed because localhost:3000 and
 * localhost:4000 are the same site for cookie purposes, so the session cookie rode
 * along and the download worked. On Vercel -> Render it is cross-site, the cookie
 * does not come, and the server sees an anonymous request.
 *
 * Fetching lets the same auth header used by every other call apply here too, at
 * the cost of buffering the file in memory — fine for a script and a ~26 KB .vsix.
 *
 * `filename` is passed in rather than read from Content-Disposition: that header is
 * not CORS-safelisted, so a cross-origin response hides it unless the server adds
 * Access-Control-Expose-Headers. The caller already knows what it asked for.
 */
export async function apiDownload(
  path: string,
  query?: RequestOptions["query"],
): Promise<Blob> {
  const url = buildUrl(path, query);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers,
      cache: "no-store",
      // Kept alongside the bearer token: a same-site deployment authenticates by
      // cookie, and this costs nothing when there isn't one.
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      `Backend not reachable at ${API_BASE_URL}`,
      "network",
      null,
      API_BASE_URL,
    );
  }

  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") message = data.message;
    } catch {
      /* not JSON — keep the status-based message */
    }
    throw new ApiError(message, "http", res.status, API_BASE_URL);
  }

  return res.blob();
}

/**
 * Save a Blob to disk under a chosen name.
 *
 * The object URL is revoked on the next tick rather than immediately: Firefox
 * cancels an in-flight download if its source URL is revoked synchronously.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * POST raw bytes — for uploading a file whose contents must arrive untouched.
 *
 * Separate from `apiRequest` because that function JSON-stringifies its body,
 * which would corrupt a binary. Deliberately NOT multipart: the server reads the
 * raw body, so there is no form to encode and no parser to add on either side.
 *
 * Everything else mirrors `apiRequest` exactly — bearer token, `credentials:
 * "include"` for the session cookie, and the same ApiError shapes — so callers
 * cannot end up handling two different error vocabularies.
 */
export async function apiUpload<T>(path: string, file: Blob): Promise<T> {
  const url = buildUrl(path);
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: file,
      cache: "no-store",
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      `Backend not reachable at ${API_BASE_URL}`,
      "network",
      null,
      API_BASE_URL,
    );
  }

  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") message = data.message;
      else if (Array.isArray(data?.message)) message = data.message.join(", ");
    } catch {
      /* not JSON — keep the status-based message */
    }
    throw new ApiError(message, "http", res.status, API_BASE_URL);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
