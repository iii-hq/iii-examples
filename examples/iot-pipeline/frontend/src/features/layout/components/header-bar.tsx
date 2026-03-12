import { functionQueries, workerQueries } from "@/shared/api/queries";
import { useConnectionStore } from "@/shared/stores/connection.store";
import type { ConnectionStatus } from "@/shared/types/api";
import { Badge } from "@/shared/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Cpu, GitBranch } from "lucide-react";

const statusConfig: Record<ConnectionStatus, { label: string }> = {
  connected: { label: "Connected" },
  connecting: { label: "Connecting" },
  disconnected: { label: "Disconnected" },
};

export function HeaderBar() {
  const { data: workersData, isFetching: workersFetching } = useQuery(workerQueries.list());
  const { data: functionsData } = useQuery(functionQueries.list());
  const connectionStatus = useConnectionStore((s) => s.status);

  const workerCount = workersData?.workers?.length ?? 0;
  const functionCount = functionsData?.functions?.length ?? 0;

  const status = statusConfig[connectionStatus];

  return (
    <header className="shrink-0 border-b border-border-default bg-bg-surface">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-accent" />
          <h1 className="text-sm font-semibold text-accent">IoT Pipeline Dashboard</h1>
          {workersFetching && workersData && (
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="gap-1.5 border-border-default bg-bg-elevated text-text-secondary"
          >
            <Cpu className="size-3" />
            Workers: {workerCount}
          </Badge>
          <Badge
            variant="outline"
            className="gap-1.5 border-border-default bg-bg-elevated text-text-secondary"
          >
            <GitBranch className="size-3" />
            Functions: {functionCount}
          </Badge>
          <div className="ml-2 flex items-center gap-1.5 border-l border-border-default pl-3">
            {connectionStatus === "connected" && (
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
            )}
            {connectionStatus === "connecting" && (
              <span className="inline-flex size-2.5 rounded-full bg-warning animate-pulse" />
            )}
            {connectionStatus === "disconnected" && (
              <span className="inline-flex size-2.5 rounded-full bg-error" />
            )}
            <span className="text-xs text-text-muted">{status.label}</span>
          </div>
        </div>
      </div>

      {connectionStatus === "disconnected" && (
        <div className="flex items-center gap-1.5 border-t border-warning/20 bg-warning/10 px-4 py-0.5">
          <AlertTriangle className="size-3 text-warning shrink-0" />
          <span className="text-[10px] text-warning">
            Disconnected — showing last known data
          </span>
        </div>
      )}
    </header>
  );
}
