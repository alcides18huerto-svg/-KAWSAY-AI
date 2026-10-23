
/**
 * Base URL of the KAWSAY AI backend (FastAPI).
 *
 * In development it falls back to the local server; in production the value
 * MUST be provided at build time via ``VITE_API_URL`` (see .env.example),
 * otherwise requests would target the visitor's own machine.
 */
const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  // Fail loudly during the build instead of shipping a broken localhost URL.
  throw new Error(
    "VITE_API_URL is not set. Configure it before building for production (see .env.example)."
  );
}

/** Abort pending requests so a sleeping/cold backend cannot hang the UI forever. */
const REQUEST_TIMEOUT_MS = 20_000;

export async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token: string | null = null;
  try {
    token = localStorage.getItem("token");
  } catch {
    token = null; // localStorage unavailable (private/embedded mode)
  }

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API}${normalizedPath}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "El servidor no respondió a tiempo. Puede estar iniciando; inténtalo de nuevo."
      );
    }
    throw new Error(
      "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo."
    );
  } finally {
    clearTimeout(timer);
  }

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
      try {
        localStorage.removeItem("token");
      } catch {
        /* ignore */
      }
    }

    // Cold-start on Render: FastAPI may answer 502/503 while the service wakes up.
    if (response.status === 502 || response.status === 503) {
      throw new Error(
        "El servidor está iniciando en Render. Espera unos segundos e inténtalo de nuevo."
      );
    }

    throw new Error(message || `Error HTTP ${response.status}`);
  }

  return body as T;
}

/**
 * Production checklist for Render (static site):
 *   1. Root Directory = frontend-web/teacher-web
 *   2. Build Command  = npm install && npm run build
 *   3. Publish Directory = dist
 *   4. Environment variable VITE_API_URL = https://<tu-backend>.onrender.com/api/v1
 *      (and add this site's URL to BACKEND_CORS_ORIGINS in the backend service).
 */

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
