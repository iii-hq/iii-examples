import { cn } from "@/shared/lib/utils";
import { useEffect, useRef } from "react";
import { useAlertStore } from "../stores/alert.store";

export function AlertLog() {
  const alerts = useAlertStore((s) => s.alerts);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new alerts arrive (list is reverse-chronological)
  const alertCount = alerts.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally scroll on alertCount change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [alertCount]);

  if (alerts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-2">
        <p className="text-sm text-text-muted">
          No alerts yet -- anomaly events will appear here in real-time
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-y-auto h-full p-2 space-y-1 font-mono text-xs">
      {alerts.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2 py-1 border-b border-border-default/50"
        >
          <span className="text-text-muted whitespace-nowrap">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span
            className={cn(
              "px-1 rounded text-[10px] font-bold uppercase whitespace-nowrap",
              entry.severity === "critical"
                ? "bg-red-500/20 text-red-400"
                : entry.severity === "warning"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-cyan-500/20 text-cyan-400",
            )}
          >
            {entry.severity}
          </span>
          <span className="text-text-secondary truncate">{entry.message}</span>
          {entry.sensorId && (
            <span className="ml-auto text-text-muted whitespace-nowrap">{entry.sensorId}</span>
          )}
          {entry.zScore > 0 && (
            <span className="text-text-muted whitespace-nowrap">z={entry.zScore.toFixed(1)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
