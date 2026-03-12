import { cn } from "@/shared/lib/utils";

export function StatusBadge({ status, timeMs }: { status: number; timeMs: number }) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span
        className={cn(
          "rounded px-1.5 py-0.5 font-medium",
          status >= 200 && status < 300 && "bg-success/20 text-success",
          status >= 400 && status < 500 && "bg-warning/20 text-warning",
          (status >= 500 || status === 0) && "bg-error/20 text-error",
        )}
      >
        {status === 0 ? "ERR" : status}
      </span>
      <span className="text-text-muted">{timeMs}ms</span>
    </div>
  );
}
