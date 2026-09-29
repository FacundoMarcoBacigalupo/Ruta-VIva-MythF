/**
 * Cliente HTTP basado en fetch nativo (sin axios).
 * Maneja headers de auth, errores JSON y parseo automático.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  auth?: boolean;
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("rv_auth");
    if (!raw) return null;
    return JSON.parse(raw).state?.token ?? null;
  } catch {
    return null;
  }
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal, auth = false } = opts;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : response.statusText) || "Error de red";
    throw new ApiError(response.status, message, payload);
  }
  return payload as T;
}
