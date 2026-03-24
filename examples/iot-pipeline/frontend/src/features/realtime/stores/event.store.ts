import { INITIAL_EDGES } from "@/features/graph/data/graph-topology";
import { create } from "zustand";
import type { DashboardEvent } from "../types";

/**
 * Convert a graph node ID like "fn-sensors-data-ingest" to a function_id like "sensors::data::ingest".
 * Strips the "fn-" prefix and replaces "-" with "::".
 */
function nodeIdToFunctionId(nodeId: string): string {
  return nodeId.replace(/^fn-/, "").replace(/-/g, "::");
}

/** Build a lookup: function_id -> list of invocation edge IDs whose target matches that function */
const functionToEdges = new Map<string, string[]>();

for (const edge of INITIAL_EDGES) {
  if (edge.type !== "invocation") continue;
  const fnId = nodeIdToFunctionId(edge.target);
  const existing = functionToEdges.get(fnId) ?? [];
  existing.push(edge.id);
  functionToEdges.set(fnId, existing);
}

interface EventStore {
  activeEdges: Map<string, number>;
  flashingNodes: Map<string, number>;
  addEvent: (event: DashboardEvent) => void;
  tick: () => void;
}

export const useEventStore = create<EventStore>()((set) => ({
  activeEdges: new Map(),
  flashingNodes: new Map(),

  addEvent: (event: DashboardEvent) =>
    set((state) => {
      const now = Date.now();

      if (event.type === "function_call") {
        const fnId = event.payload.function_id as string | undefined;
        if (!fnId) return state;

        const edgeIds = functionToEdges.get(fnId);
        if (!edgeIds || edgeIds.length === 0) return state;

        const nextEdges = new Map(state.activeEdges);
        for (const edgeId of edgeIds) {
          nextEdges.set(edgeId, now + 1500);
        }
        return { activeEdges: nextEdges };
      }

      if (event.type === "anomaly_alert") {
        const nextNodes = new Map(state.flashingNodes);
        nextNodes.set("worker-python", now + 2000);
        return { flashingNodes: nextNodes };
      }

      return state;
    }),

  tick: () =>
    set((state) => {
      const now = Date.now();
      let edgesChanged = false;
      let nodesChanged = false;

      for (const [, expiry] of state.activeEdges) {
        if (expiry <= now) {
          edgesChanged = true;
          break;
        }
      }

      for (const [, expiry] of state.flashingNodes) {
        if (expiry <= now) {
          nodesChanged = true;
          break;
        }
      }

      if (!edgesChanged && !nodesChanged) return state;

      const nextEdges = edgesChanged ? new Map<string, number>() : state.activeEdges;
      if (edgesChanged) {
        for (const [key, expiry] of state.activeEdges) {
          if (expiry > now) nextEdges.set(key, expiry);
        }
      }

      const nextNodes = nodesChanged ? new Map<string, number>() : state.flashingNodes;
      if (nodesChanged) {
        for (const [key, expiry] of state.flashingNodes) {
          if (expiry > now) nextNodes.set(key, expiry);
        }
      }

      return { activeEdges: nextEdges, flashingNodes: nextNodes };
    }),
}));

// Periodic cleanup of expired animation entries
setInterval(() => useEventStore.getState().tick(), 500);
