import { cn } from "@/shared/lib/utils";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";

const WORKER_COLORS: Record<string, string> = {
  "worker-rust": "#CE422B",
  "worker-python": "#3776AB",
  "worker-node": "#339933",
};

export type FunctionNodeType = Node<
  {
    label: string;
    description: string;
    workerId: string;
    namespace: string;
  },
  "function"
>;

export function FunctionNode({ data, selected }: NodeProps<FunctionNodeType>) {
  const borderColor = WORKER_COLORS[data.workerId] ?? "#404040";

  return (
    <div
      className={cn(
        "rounded-md bg-bg-elevated px-3 py-2 min-w-[200px] border-l-2",
        selected && "ring-2 ring-accent",
      )}
      style={{ borderLeftColor: borderColor }}
    >
      <Handle type="target" position={Position.Left} className="!bg-border-active" />

      <div className="text-xs font-mono text-text-primary leading-tight">{data.label}</div>
      <div className="text-xs text-text-muted truncate mt-0.5">{data.description}</div>

      <Handle type="source" position={Position.Right} className="!bg-border-active" />
    </div>
  );
}
