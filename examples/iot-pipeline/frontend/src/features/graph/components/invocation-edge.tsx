import { useEventStore } from "@/features/realtime/stores/event.store";
import { BaseEdge, type EdgeProps, MarkerType, getBezierPath } from "@xyflow/react";

export function InvocationEdge({
  id,
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

  const activeEdges = useEventStore((s) => s.activeEdges);
  const isActive = activeEdges.has(id);

  return (
    <>
      <defs>
        <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feFlood floodColor="#22d3ee" floodOpacity="0.6" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <BaseEdge
        path={edgePath}
        markerEnd={MarkerType.ArrowClosed}
        style={{
          stroke: "#22d3ee",
          strokeOpacity: isActive ? 0.8 : 0.25,
          strokeWidth: isActive ? 2.5 : 1.5,
          strokeDasharray: "6 3",
          filter: isActive ? "drop-shadow(0 0 6px #22d3ee)" : "drop-shadow(0 0 2px #22d3ee)",
          transition: "stroke-opacity 0.5s, stroke-width 0.3s, filter 0.5s",
        }}
      />

      {isActive && (
        <g>
          {/* Outer glow */}
          <circle r="5" fill="#22d3ee" opacity="0.3">
            <animateMotion dur="1.2s" repeatCount="1" path={edgePath} fill="freeze" />
          </circle>
          {/* Inner bright dot */}
          <circle r="3" fill="#22d3ee" filter="url(#particleGlow)">
            <animateMotion dur="1.2s" repeatCount="1" path={edgePath} fill="freeze" />
          </circle>
        </g>
      )}
    </>
  );
}
