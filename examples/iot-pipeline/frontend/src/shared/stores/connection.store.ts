import type { ConnectionStatus } from "@/shared/types/api";
import { create } from "zustand";

interface ConnectionStore {
  status: ConnectionStatus;
  setConnected: () => void;
  setDisconnected: () => void;
}

export const useConnectionStore = create<ConnectionStore>()((set) => ({
  status: "disconnected",
  setConnected: () => set({ status: "connected" }),
  setDisconnected: () => set({ status: "disconnected" }),
}));
