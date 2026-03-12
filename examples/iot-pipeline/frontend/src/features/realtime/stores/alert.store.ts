import { create } from "zustand";

export interface AlertEntry {
  id: string;
  timestamp: number;
  sensorId: string;
  severity: string;
  message: string;
  zScore: number;
}

const MAX_ALERTS = 200;

interface AlertStore {
  alerts: AlertEntry[];
  addAlert: (payload: Record<string, unknown>) => void;
  addWorkerEvent: (payload: Record<string, unknown>) => void;
}

export const useAlertStore = create<AlertStore>()((set) => ({
  alerts: [],

  addAlert: (payload) =>
    set((state) => {
      const entry: AlertEntry = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        sensorId: (payload.sensor_id as string) ?? "",
        severity: (payload.severity as string) ?? "warning",
        message: (payload.message as string) ?? "Anomaly detected",
        zScore: (payload.z_score as number) ?? 0,
      };
      return { alerts: [entry, ...state.alerts].slice(0, MAX_ALERTS) };
    }),

  addWorkerEvent: (payload) =>
    set((state) => {
      const functions = payload.functions as string[] | undefined;
      const entry: AlertEntry = {
        id: `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        sensorId: "",
        severity: "info",
        message: `Worker functions discovered: ${functions?.join(", ") ?? "unknown"}`,
        zScore: 0,
      };
      return { alerts: [entry, ...state.alerts].slice(0, MAX_ALERTS) };
    }),
}));
