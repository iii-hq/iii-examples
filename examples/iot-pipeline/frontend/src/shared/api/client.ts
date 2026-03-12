export interface ApiResponse<T = unknown> {
  status: number;
  statusText: string;
  data: T;
  timeMs: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: string): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: string,
): Promise<ApiResponse<T>> {
  const start = performance.now();
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body,
  });
  const timeMs = Math.round(performance.now() - start);
  const data = (await res.json()) as T;
  return { status: res.status, statusText: res.statusText, data, timeMs };
}

export const apiClient = { get, post, request };
