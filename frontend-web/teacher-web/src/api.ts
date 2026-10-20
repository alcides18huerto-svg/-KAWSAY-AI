
const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

export async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");

  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const response = await fetch(`${API}${normalizedPath}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = body?.detail;

    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map((item: { msg?: string }) => item.msg)
              .filter(Boolean)
              .join(", ")
          : body?.message;

    if (response.status === 401) {
      localStorage.removeItem("token");
    }

    throw new Error(message || `Error HTTP ${response.status}`);
  }

  return body as T;
}

/**
 * Reads a claim from a JWT payload without verifying the signature.
 *
 * The backend returns only tokens from ``/auth/login`` (no user object), so the
 * role must be read from the access token. Fails soft: an unreadable token
 * returns ``null`` and the caller decides how to react.
 */
export function claimFromToken<T = unknown>(token: string, claim: string): T | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return (JSON.parse(decoded)[claim] ?? null) as T | null;
  } catch {
    return null;
  }
}

/** Role carried by an access token, or ``null`` when it cannot be read. */
export function roleFromToken(token: string): string | null {
  return claimFromToken<string>(token, 'role');
}
