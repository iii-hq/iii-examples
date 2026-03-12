import { ArchitectureGraph } from "@/features/graph/components/architecture-graph";
import { BottomPanel } from "@/features/layout/components/bottom-panel";
import { HeaderBar } from "@/features/layout/components/header-bar";
import { SidebarPanel } from "@/features/layout/components/sidebar-panel";

export function DashboardLayout() {
  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateRows: "auto 1fr auto",
        gridTemplateColumns: "1fr",
      }}
    >
      {/* Row 1: Header spanning full width */}
      <HeaderBar />

      {/* Row 2: Sidebar + Graph area */}
      <div className="flex min-h-0 overflow-hidden">
        <SidebarPanel />
        <ArchitectureGraph />
      </div>

      {/* Row 3: Bottom panel spanning full width */}
      <BottomPanel />
    </div>
  );
}
