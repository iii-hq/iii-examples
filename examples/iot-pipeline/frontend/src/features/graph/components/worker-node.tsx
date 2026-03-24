import { useEventStore } from "@/features/realtime/stores/event.store";
import { cn } from "@/shared/lib/utils";
import type { WorkerLanguage } from "@/shared/types/worker";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { motion } from "framer-motion";
import { LanguageIcon } from "./language-icon";

const LANGUAGE_COLORS: Record<WorkerLanguage, string> = {
  rust: "#CE422B",
  python: "#3776AB",
  node: "#339933",
};

export type WorkerNodeType = Node<
  {
    label: string;
    language: WorkerLanguage;
    status: "connected" | "disconnected";
    functionCount: number;
  },
  "worker"
>;

export function WorkerNode({ id, data, selected }: NodeProps<WorkerNodeType>) {
  const borderColor = LANGUAGE_COLORS[data.language];
  const flashingNodes = useEventStore((s) => s.flashingNodes);
  const isFlashing = flashingNodes.has(id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: data.status === "disconnected" ? 0.3 : 1,
        scale: 1,
        boxShadow: isFlashing
          ? [
              "0 0 0 0 rgba(239,68,68,0)",
              "0 0 20px 8px rgba(239,68,68,0.6)",
              "0 0 0 0 rgba(239,68,68,0)",
            ]
          : "none",
      }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
        boxShadow: { duration: 2, ease: "easeOut" },
      }}
      className={cn(
        "rounded-lg bg-bg-surface p-3 min-w-[160px] border-2",
        selected && "ring-2 ring-accent",
      )}
      style={{ borderColor }}
    >
      <Handle type="target" position={Position.Left} className="!bg-border-active" />

      <div className="flex items-center gap-2 mb-1">
        <LanguageIcon language={data.language} />
        <span className="text-sm font-medium text-text-primary">{data.label}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              data.status === "connected" ? "bg-success" : "bg-error",
            )}
          />
          <span className="text-xs text-text-muted">{data.status}</span>
        </div>
        <span className="text-xs text-text-muted">{data.functionCount} fn</span>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-border-active" />
    </motion.div>
  );
}
