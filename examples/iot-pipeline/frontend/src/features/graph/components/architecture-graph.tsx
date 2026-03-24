import { Background, MiniMap, type Node, ReactFlow } from "@xyflow/react";
import { AnimatePresence } from "framer-motion";
import { useCallback } from "react";

import { useGraphStore } from "../graph.store";
import { useLiveGraph } from "../hooks/use-live-graph";
import { DetailPanel } from "./detail-panel";
import { FunctionNode } from "./function-node";
import { InvocationEdge } from "./invocation-edge";
import { OwnershipEdge } from "./ownership-edge";
import { WorkerNode } from "./worker-node";

const nodeTypes = { worker: WorkerNode, function: FunctionNode } as const;
const edgeTypes = { ownership: OwnershipEdge, invocation: InvocationEdge } as const;

const LANGUAGE_COLORS: Record<string, string> = {
  rust: "#CE422B",
  python: "#3776AB",
  node: "#339933",
};

const DEFAULT_NODE_COLOR = "#1e1e1e";

function getMiniMapNodeColor(node: { data?: Record<string, unknown>; type?: string }): string {
  if (node.type === "worker" && node.data?.language) {
    return LANGUAGE_COLORS[node.data.language as string] ?? DEFAULT_NODE_COLOR;
  }
  return DEFAULT_NODE_COLOR;
}

export function ArchitectureGraph() {
  const { nodes, edges } = useLiveGraph();

  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const noop = useCallback(() => {}, []);

  return (
    <div className="flex-1 min-h-0 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={noop}
        onEdgesChange={noop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <MiniMap
          nodeColor={getMiniMapNodeColor}
          maskColor="rgba(10,10,10,0.7)"
          bgColor="#141414"
          position="bottom-right"
        />
        <Background color="#262626" gap={24} size={1} />
      </ReactFlow>

      <AnimatePresence>{selectedNodeId && <DetailPanel key="detail-panel" />}</AnimatePresence>
    </div>
  );
}
