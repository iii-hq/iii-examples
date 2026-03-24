import type { FunctionInfo, WorkerInfo, WorkerLanguage } from "@/shared/types/worker";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

/** Raw shapes from the iii engine API (snake_case, different field names) */
interface RawWorker {
  id: string;
  name: string | null;
  runtime: string | null;
  status: string;
  function_count: number;
  functions: string[];
}

interface RawFunction {
  function_id: string;
  description: string | null;
}

/** App-level function namespaces (filters out engine internals like state::, stream::, iii.*) */
const APP_NAMESPACES = ["sensors", "analytics", "api"];

function normalizeLanguage(runtime: string | null): WorkerLanguage {
  if (runtime === "rust") return "rust";
  if (runtime === "python") return "python";
  return "node";
}

const WORKER_DISPLAY_NAMES: Record<WorkerLanguage, string> = {
  rust: "iot-sensor-worker",
  python: "iot-analytics-worker",
  node: "iot-api-gateway",
};

function transformWorkers(raw: { workers: RawWorker[] }): { workers: WorkerInfo[] } {
  // Deduplicate by runtime — keep the worker with the most functions per language
  const byRuntime = new Map<string, RawWorker>();
  for (const w of raw.workers) {
    if (!w.runtime) continue;
    const lang = normalizeLanguage(w.runtime);
    const existing = byRuntime.get(lang);
    if (!existing || w.function_count > existing.function_count) {
      byRuntime.set(lang, w);
    }
  }
  return {
    workers: [...byRuntime.values()].map((w) => {
      const lang = normalizeLanguage(w.runtime);
      return {
        id: w.id,
        name: WORKER_DISPLAY_NAMES[lang],
        language: lang,
        status: (w.status === "connected" ? "connected" : "disconnected") as "connected" | "disconnected",
        functionCount: w.function_count,
      };
    }),
  };
}

function transformFunctions(raw: { functions: RawFunction[] }): { functions: FunctionInfo[] } {
  const appFunctions = raw.functions.filter((f) => {
    const ns = f.function_id.split("::")[0];
    return APP_NAMESPACES.includes(ns);
  });
  return {
    functions: appFunctions.map((f) => {
      const ns = f.function_id.split("::")[0];
      return {
        id: f.function_id,
        name: f.function_id,
        namespace: ns,
        description: f.description ?? "",
        workerId: "",
      };
    }),
  };
}

export const workerQueries = {
  list: () =>
    queryOptions({
      queryKey: ["workers"],
      queryFn: async () => {
        const raw = await apiClient.get<{ workers: RawWorker[] }>("/system/workers");
        return transformWorkers(raw);
      },
      placeholderData: keepPreviousData,
    }),
};

export const functionQueries = {
  list: () =>
    queryOptions({
      queryKey: ["functions"],
      queryFn: async () => {
        const raw = await apiClient.get<{ functions: RawFunction[] }>("/system/functions");
        return transformFunctions(raw);
      },
      placeholderData: keepPreviousData,
    }),
};

// sensorQueries removed -- sensor data now flows via WebSocket -> Zustand store

export const analyticsQueries = {
  summary: () =>
    queryOptions({
      queryKey: ["analytics", "summary"],
      queryFn: () => apiClient.get<{ stats: unknown }>("/analytics/summary"),
      refetchInterval: 3000,
      placeholderData: keepPreviousData,
    }),
};
