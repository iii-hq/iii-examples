import { create } from "zustand";

type BottomTab = "sensors" | "playground" | "alerts";

interface LayoutState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  bottomPanelOpen: boolean;
  bottomPanelHeight: number;
  activeBottomTab: BottomTab;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  toggleBottomPanel: () => void;
  setBottomPanelHeight: (height: number) => void;
  setActiveBottomTab: (tab: BottomTab) => void;
}

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const BOTTOM_MIN = 150;
const BOTTOM_MAX = 500;

function clampSidebar(width: number): number {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, width));
}

function clampBottom(height: number): number {
  return Math.min(BOTTOM_MAX, Math.max(BOTTOM_MIN, height));
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  sidebarOpen: true,
  sidebarWidth: 280,
  bottomPanelOpen: true,
  bottomPanelHeight: 260,
  activeBottomTab: "sensors",

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarWidth: (width: number) => set({ sidebarWidth: clampSidebar(width) }),

  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),

  setBottomPanelHeight: (height: number) => set({ bottomPanelHeight: clampBottom(height) }),

  setActiveBottomTab: (tab: BottomTab) => set({ activeBottomTab: tab }),
}));
