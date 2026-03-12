import { workerQueries } from "@/shared/api/queries";
import { useConnectionStore } from "@/shared/stores/connection.store";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { INITIAL_EDGES, INITIAL_NODES } from "../data/graph-topology";
import { getLayoutedElements } from "./use-graph-layout";

/**
 * Always use the static topology (INITIAL_NODES + INITIAL_EDGES) for graph layout.
 * Overlay live worker status (connected/disconnected, functionCount) from API polling.
 * This avoids mismatched IDs between dynamic API nodes and static edge definitions.
 */
export function useLiveGraph() {
  const { data: workersData } = useQuery(workerQueries.list());
  const connectionStatus = useConnectionStore((s) => s.status);

  const workers = workersData?.workers ?? null;
  const isLive = connectionStatus === "connected" && workers !== null;

  // Static layout — computed once
  const baseTopology = useMemo(() => getLayoutedElements(INITIAL_NODES, INITIAL_EDGES), []);

  // Overlay live worker status onto static nodes
  const nodesWithStatus = useMemo(() => {
    if (!workers) return baseTopology.nodes;
    return baseTopology.nodes.map((node) => {
      if (node.type !== "worker") return node;
      // Match by static node ID pattern "worker-{language}" to live worker language
      const lang = node.id.replace("worker-", "");
      const liveWorker = workers.find((w) => w.language === lang);
      if (!liveWorker) return node;
      return {
        ...node,
        data: { ...node.data, status: liveWorker.status, functionCount: liveWorker.functionCount },
      };
    });
  }, [baseTopology.nodes, workers]);

  const animatedNodes = useMemo(() => {
    return nodesWithStatus.map((node) => ({
      ...node,
      style: {
        ...node.style,
        transition: "transform 300ms ease-out",
      },
    }));
  }, [nodesWithStatus]);

  return { nodes: animatedNodes, edges: baseTopology.edges, isLive };
}
