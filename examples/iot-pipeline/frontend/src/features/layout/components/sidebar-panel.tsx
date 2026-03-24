import { useGraphStore } from "@/features/graph/graph.store";
import { useLayoutStore } from "@/features/layout/stores/layout.store";
import { functionQueries, workerQueries } from "@/shared/api/queries";
import { cn } from "@/shared/lib/utils";
import type { WorkerLanguage } from "@/shared/types/worker";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Circle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

const languageColors: Record<WorkerLanguage, string> = {
  rust: "text-rust",
  python: "text-python",
  node: "text-node",
};

function inferNamespace(worker: { name?: string; language?: string }): string {
  if (worker.language === "rust" || worker.name?.includes("rust")) return "sensors";
  if (worker.language === "python" || worker.name?.includes("python")) return "analytics";
  return "api";
}

export function SidebarPanel() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth);
  const isDragging = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);

  const { data: workersData } = useQuery(workerQueries.list());
  const { data: functionsData } = useQuery(functionQueries.list());

  const workerTree = useMemo(() => {
    const workers = workersData?.workers ?? [];
    const functions = functionsData?.functions ?? [];
    return workers.map((w) => ({
      id: String(w.id ?? ""),
      name: String(w.name ?? ""),
      language: (w.language ?? "node") as WorkerLanguage,
      status: w.status === "connected" ? ("connected" as const) : ("disconnected" as const),
      functionCount: Number(w.functionCount ?? 0),
      functions: functions
        .filter((f) => f.workerId === w.id || f.namespace === inferNamespace(w))
        .map((f) => ({
          id: String(f.id ?? ""),
          label: String(f.name ?? f.id ?? ""),
        })),
    }));
  }, [workersData, functionsData]);

  useEffect(() => {
    if (!selectedNodeId || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current.querySelector(`[data-node-id="${selectedNodeId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedNodeId]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (isDragging.current) {
          setSidebarWidth(moveEvent.clientX);
        }
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [setSidebarWidth],
  );

  useEffect(() => {
    return () => {
      isDragging.current = false;
    };
  }, []);

  if (!sidebarOpen) {
    return null;
  }

  return (
    <div className="relative flex" style={{ width: sidebarWidth }}>
      <div className="flex flex-1 flex-col overflow-hidden border-r border-border-default bg-bg-surface">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-default px-3">
          <span className="text-xs font-medium text-text-secondary">Workers & Functions</span>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex size-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2">
          {!workersData ? (
            <div className="animate-pulse space-y-1 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 rounded bg-bg-elevated" />
              ))}
            </div>
          ) : (
            workerTree.map((worker) => (
              <div key={worker.id} className={cn(worker.status === "disconnected" && "opacity-50")}>
                <button
                  type="button"
                  data-node-id={worker.id}
                  onClick={() => selectNode(worker.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-bg-elevated",
                    selectedNodeId === worker.id && "bg-bg-elevated",
                  )}
                >
                  <Circle
                    className={cn(
                      "size-2.5 shrink-0 fill-current",
                      worker.status === "connected"
                        ? languageColors[worker.language]
                        : "text-error",
                    )}
                  />
                  <span className="truncate text-text-primary">{worker.name}</span>
                  <span className="ml-auto whitespace-nowrap text-text-muted">
                    ({worker.functionCount} fn)
                  </span>
                  {worker.status === "disconnected" && (
                    <span className="ml-1 text-[10px] text-error">offline</span>
                  )}
                </button>

                <div className="ml-4">
                  {worker.functions.map((fn) => (
                    <button
                      key={fn.id}
                      type="button"
                      data-node-id={fn.id}
                      onClick={() => selectNode(fn.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors hover:bg-bg-elevated",
                        selectedNodeId === fn.id && "bg-bg-elevated",
                      )}
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-text-muted" />
                      <span className="truncate font-mono text-text-secondary">{fn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Draggable divider */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-accent"
      />
    </div>
  );
}
