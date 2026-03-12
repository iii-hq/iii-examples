import { functionQueries, workerQueries } from "@/shared/api/queries";
import { cn } from "@/shared/lib/utils";
import type { WorkerLanguage } from "@/shared/types/worker";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

import { INITIAL_NODES } from "../data/graph-topology";
import type { FunctionNodeData, WorkerNodeData } from "../data/graph-topology";
import { useGraphStore } from "../graph.store";

const LANGUAGE_BG: Record<WorkerLanguage, string> = {
  rust: "bg-[#CE422B]",
  python: "bg-[#3776AB]",
  node: "bg-[#339933]",
};

const LANGUAGE_LABELS: Record<WorkerLanguage, string> = {
  rust: "Rust",
  python: "Python",
  node: "Node.js",
};

function WorkerDetail({
  data,
  childFunctions,
}: {
  data: WorkerNodeData;
  childFunctions: { id: string; label: string }[];
}) {
  const selectNode = useGraphStore((s) => s.selectNode);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-text-primary">{data.label}</h3>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded px-2 py-0.5 text-xs font-medium text-white",
            LANGUAGE_BG[data.language],
          )}
        >
          {LANGUAGE_LABELS[data.language]}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-block size-2 rounded-full",
            data.status === "connected" ? "bg-success" : "bg-error",
          )}
        />
        <span className="text-xs text-text-secondary">
          {data.status === "connected" ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="text-xs text-text-muted">{data.functionCount} functions</div>

      {childFunctions.length > 0 && (
        <div className="mt-1">
          <h4 className="mb-1.5 text-xs font-medium text-text-secondary">Functions</h4>
          <div className="flex flex-col gap-0.5">
            {childFunctions.map((fn) => (
              <button
                key={fn.id}
                type="button"
                onClick={() => selectNode(fn.id)}
                className="rounded px-2 py-1 text-left text-xs font-mono text-text-primary transition-colors hover:bg-bg-elevated"
              >
                {fn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FunctionDetail({ data }: { data: FunctionNodeData }) {
  const { data: workersData } = useQuery(workerQueries.list());

  const staticOwner = INITIAL_NODES.find((n) => n.id === data.workerId);
  const staticData = staticOwner?.data as WorkerNodeData | undefined;
  const liveOwner = workersData?.workers?.find((w) => w.language === staticData?.language);
  const ownerLabel = liveOwner?.name ?? staticData?.label;
  const ownerLanguage: WorkerLanguage | undefined = liveOwner?.language ?? staticData?.language;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-mono text-text-primary">{data.label}</h3>

      <p className="text-xs text-text-secondary">{data.description}</p>

      {ownerLabel && ownerLanguage && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Worker:</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-medium text-white",
              LANGUAGE_BG[ownerLanguage],
            )}
          >
            {ownerLabel}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Namespace:</span>
        <span className="text-xs text-text-secondary">{data.namespace}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Status:</span>
        <span className="text-xs text-text-secondary">Registered</span>
      </div>
    </div>
  );
}

export function DetailPanel() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);

  const { data: workersData } = useQuery(workerQueries.list());
  const { data: functionsData } = useQuery(functionQueries.list());

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        selectNode(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectNode]);

  // Try live data first, fall back to static INITIAL_NODES
  const liveWorker = workersData?.workers?.find((w) => w.id === selectedNodeId);
  const liveFunction = functionsData?.functions?.find((f) => f.id === selectedNodeId);
  const staticNode = INITIAL_NODES.find((n) => n.id === selectedNodeId);

  const isWorker = liveWorker != null || staticNode?.type === "worker";

  // Normalize worker data
  const workerData: WorkerNodeData | null = liveWorker
    ? {
        label: liveWorker.name,
        language: liveWorker.language,
        status: liveWorker.status,
        functionCount:
          liveWorker.functionCount ??
          functionsData?.functions?.filter((f) => f.workerId === liveWorker.id).length ??
          0,
      }
    : staticNode?.type === "worker"
      ? (staticNode.data as WorkerNodeData)
      : null;

  // Normalize function data
  const functionData: FunctionNodeData | null = liveFunction
    ? {
        label: liveFunction.name ?? liveFunction.id,
        description: liveFunction.description ?? "",
        workerId: liveFunction.workerId ?? "",
        namespace: liveFunction.namespace ?? "",
      }
    : staticNode?.type === "function"
      ? (staticNode.data as FunctionNodeData)
      : null;

  // Build child functions list for worker detail
  const childFunctions = isWorker
    ? (functionsData?.functions
        ?.filter((f) => f.workerId === selectedNodeId)
        .map((f) => ({ id: f.id, label: f.name ?? f.id })) ??
      INITIAL_NODES.filter(
        (n) => n.type === "function" && (n.data as FunctionNodeData).workerId === selectedNodeId,
      ).map((n) => ({ id: n.id, label: (n.data as FunctionNodeData).label })))
    : [];

  if (!workerData && !functionData) return null;

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "tween", duration: 0.2 }}
      className="absolute top-0 right-0 z-20 h-full w-80 border-l border-border-default bg-bg-surface"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <span className="text-xs font-medium text-text-muted">
            {isWorker ? "Worker Details" : "Function Details"}
          </span>
          <button
            type="button"
            onClick={() => selectNode(null)}
            className="flex size-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isWorker && workerData ? (
            <WorkerDetail data={workerData} childFunctions={childFunctions} />
          ) : functionData ? (
            <FunctionDetail data={functionData} />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
