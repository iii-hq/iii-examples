import dagre from "@dagrejs/dagre";
import { type Edge, type Node, Position } from "@xyflow/react";

const WORKER_WIDTH = 180;
const WORKER_HEIGHT = 90;
const FUNCTION_WIDTH = 240;
const FUNCTION_HEIGHT = 60;

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 100 });

  for (const node of nodes) {
    const isWorker = node.type === "worker";
    graph.setNode(node.id, {
      width: isWorker ? WORKER_WIDTH : FUNCTION_WIDTH,
      height: isWorker ? WORKER_HEIGHT : FUNCTION_HEIGHT,
    });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const dagreNode = graph.node(node.id);
    const isWorker = node.type === "worker";
    const width = isWorker ? WORKER_WIDTH : FUNCTION_WIDTH;
    const height = isWorker ? WORKER_HEIGHT : FUNCTION_HEIGHT;

    return {
      ...node,
      position: {
        x: dagreNode.x - width / 2,
        y: dagreNode.y - height / 2,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  return { nodes: layoutedNodes, edges };
}
