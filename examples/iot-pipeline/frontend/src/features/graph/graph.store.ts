import { create } from "zustand";

interface GraphState {
  selectedNodeId: string | null;
  selectNode: (id: string | null) => void;
}

export const useGraphStore = create<GraphState>()((set) => ({
  selectedNodeId: null,
  selectNode: (id: string | null) => set({ selectedNodeId: id }),
}));
