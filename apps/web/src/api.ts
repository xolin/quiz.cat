// Client HTTP mínim amb token JWT a localStorage.

const BASE = "/api";

export function getToken(): string | null {
  return localStorage.getItem("qj_token");
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem("qj_token", t);
  else localStorage.removeItem("qj_token");
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  // Fastify rebutja cos buit amb content-type json → als POST sense cos enviem "{}".
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : method !== "GET" ? "{}" : undefined;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(getToken() ? { authorization: `Bearer ${getToken()}` } : {}),
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? `HTTP ${res.status}`), { status: res.status });
  return data as T;
}
