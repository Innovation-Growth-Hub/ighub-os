/**
 * Thin fetch wrapper for the NestJS API. Requests go to /api/v1/* on this
 * origin; next.config.ts rewrites them to the API, so cookies stay first-party.
 * Errors are RFC 9457 problem+json and surface as ApiError.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly errors?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

type Body = Record<string, unknown> | unknown[] | FormData | undefined;

async function request<T>(method: string, path: string, body?: Body): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`/api/v1${path}`, {
    method,
    credentials: "same-origin",
    headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const fieldErrors: Array<{ path: string; message: string }> | undefined = data?.errors;
    const message =
      fieldErrors?.length ? fieldErrors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).join(" · ") : data?.detail ?? `Request failed (${res.status}).`;
    throw new ApiError(res.status, message, data?.code, fieldErrors);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: Body) => request<T>("POST", path, body),
  put: <T>(path: string, body?: Body) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: Body) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/** Download URLs are plain links; the browser sends the session cookie. */
export const downloadUrl = (path: string) => `/api/v1${path}`;
