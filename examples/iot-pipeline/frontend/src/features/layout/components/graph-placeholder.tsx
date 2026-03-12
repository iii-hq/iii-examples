import { Network } from "lucide-react";

export function GraphPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border-default p-10">
        <Network className="size-10 text-text-muted" />
        <span className="text-sm font-medium text-text-muted">Architecture Graph</span>
        <span className="text-xs text-text-muted">React Flow graph will render here</span>
      </div>
    </div>
  );
}
