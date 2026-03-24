import { BaseEdge, type EdgeProps, getBezierPath } from "@xyflow/react";

export function OwnershipEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: "#404040",
        strokeWidth: 1,
        strokeOpacity: 0.6,
      }}
    />
  );
}
