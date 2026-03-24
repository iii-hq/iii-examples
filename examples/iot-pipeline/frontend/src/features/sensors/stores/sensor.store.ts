import { create } from "zustand";

export const SENSOR_IDS = ["temp-001", "temp-002", "humidity-001", "humidity-002", "pressure-001"] as const;

export interface SensorReading {
  timestamp: number;
  value: number;
  sensorId: string;
}

interface SensorStore {
  readings: Record<string, SensorReading[]>;
  push: (sensorId: string, reading: SensorReading) => void;
}

const MAX_POINTS = 120; // 2-minute window at ~1 reading/sec

export const useSensorStore = create<SensorStore>()((set) => ({
  readings: {},
  push: (sensorId, reading) =>
    set((state) => {
      const current = state.readings[sensorId] ?? [];
      const next = [...current, reading].slice(-MAX_POINTS);
      return { readings: { ...state.readings, [sensorId]: next } };
    }),
}));
