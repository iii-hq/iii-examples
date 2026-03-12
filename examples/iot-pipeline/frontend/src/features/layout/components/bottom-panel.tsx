import { useLayoutStore } from "@/features/layout/stores/layout.store";
import { ApiPlayground } from "@/features/playground/components/api-playground";
import { AlertLog } from "@/features/realtime/components/alert-log";
import { SensorChart } from "@/features/sensors/components/sensor-chart";
import { cn } from "@/shared/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

const tabs = [
  { id: "sensors" as const, label: "Sensors" },
  { id: "playground" as const, label: "API Playground" },
  { id: "alerts" as const, label: "Alerts" },
];

export function BottomPanel() {
  const bottomPanelOpen = useLayoutStore((s) => s.bottomPanelOpen);
  const bottomPanelHeight = useLayoutStore((s) => s.bottomPanelHeight);
  const activeBottomTab = useLayoutStore((s) => s.activeBottomTab);
  const toggleBottomPanel = useLayoutStore((s) => s.toggleBottomPanel);
  const setBottomPanelHeight = useLayoutStore((s) => s.setBottomPanelHeight);
  const setActiveBottomTab = useLayoutStore((s) => s.setActiveBottomTab);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const startY = e.clientY;
      const startHeight = bottomPanelHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (isDragging.current) {
          const delta = startY - moveEvent.clientY;
          setBottomPanelHeight(startHeight + delta);
        }
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [bottomPanelHeight, setBottomPanelHeight],
  );

  useEffect(() => {
    return () => {
      isDragging.current = false;
    };
  }, []);

  return (
    <div
      className="flex flex-col border-t border-border-default bg-bg-surface"
      style={{ height: bottomPanelOpen ? bottomPanelHeight : 36 }}
    >
      {/* Drag handle */}
      {bottomPanelOpen && (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="horizontal"
          onMouseDown={handleMouseDown}
          className="h-1 shrink-0 cursor-row-resize transition-colors hover:bg-accent"
        />
      )}

      {/* Tab header */}
      <div className="flex h-8 shrink-0 items-center border-b border-border-default px-2">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveBottomTab(tab.id);
                if (tab.id === "playground") {
                  if (!bottomPanelOpen) toggleBottomPanel();
                  if (bottomPanelHeight < 300) setBottomPanelHeight(300);
                }
              }}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                activeBottomTab === tab.id
                  ? "bg-bg-elevated text-accent"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleBottomPanel}
          className="ml-auto flex size-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
        >
          {bottomPanelOpen ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronUp className="size-3.5" />
          )}
        </button>
      </div>

      {/* Tab content */}
      {bottomPanelOpen && (
        <div className="min-h-0 flex-1 overflow-auto">
          {activeBottomTab === "sensors" && (
            <div className="w-full p-2">
              <SensorChart />
            </div>
          )}
          {activeBottomTab === "playground" && (
            <div className="h-full w-full">
              <ApiPlayground />
            </div>
          )}
          {activeBottomTab === "alerts" && (
            <div className="h-full w-full">
              <AlertLog />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
