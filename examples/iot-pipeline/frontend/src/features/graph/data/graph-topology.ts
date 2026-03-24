import type { Edge, Node } from "@xyflow/react";

import type { WorkerLanguage } from "@/shared/types/worker";

export interface WorkerNodeData {
  label: string;
  language: WorkerLanguage;
  status: "connected" | "disconnected";
  functionCount: number;
  [key: string]: unknown;
}

export interface FunctionNodeData {
  label: string;
  description: string;
  workerId: string;
  namespace: string;
  [key: string]: unknown;
}

export type WorkerNodeType = Node<WorkerNodeData, "worker">;
export type FunctionNodeType = Node<FunctionNodeData, "function">;

const workerNodes: WorkerNodeType[] = [
  {
    id: "worker-rust",
    type: "worker",
    position: { x: 0, y: 0 },
    data: {
      label: "rust-worker",
      language: "rust",
      status: "connected",
      functionCount: 3,
    },
  },
  {
    id: "worker-python",
    type: "worker",
    position: { x: 0, y: 0 },
    data: {
      label: "python-worker",
      language: "python",
      status: "connected",
      functionCount: 2,
    },
  },
  {
    id: "worker-node",
    type: "worker",
    position: { x: 0, y: 0 },
    data: {
      label: "node-worker",
      language: "node",
      status: "connected",
      functionCount: 6,
    },
  },
];

const functionNodes: FunctionNodeType[] = [
  // Rust (sensors::*)
  {
    id: "fn-sensors-data-ingest",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "sensors::data::ingest",
      description: "Accept raw sensor JSON",
      workerId: "worker-rust",
      namespace: "sensors",
    },
  },
  {
    id: "fn-sensors-data-validate",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "sensors::data::validate",
      description: "Validate sensor data format",
      workerId: "worker-rust",
      namespace: "sensors",
    },
  },
  {
    id: "fn-sensors-aggregate-stats",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "sensors::aggregate::stats",
      description: "Atomic aggregation of stats",
      workerId: "worker-rust",
      namespace: "sensors",
    },
  },
  // Python (analytics::*)
  {
    id: "fn-analytics-stats-compute",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "analytics::stats::compute",
      description: "Compute min/max/avg/count",
      workerId: "worker-python",
      namespace: "analytics",
    },
  },
  {
    id: "fn-analytics-anomaly-detect",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "analytics::anomaly::detect",
      description: "Z-score anomaly detection",
      workerId: "worker-python",
      namespace: "analytics",
    },
  },
  // Node.js (api::*)
  {
    id: "fn-api-http-post-sensors",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "api::http::post::sensors",
      description: "POST /sensors/ingest endpoint",
      workerId: "worker-node",
      namespace: "api",
    },
  },
  {
    id: "fn-api-http-get-sensors-id",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "api::http::get::sensors_id",
      description: "GET /sensors/:id endpoint",
      workerId: "worker-node",
      namespace: "api",
    },
  },
  {
    id: "fn-api-http-get-analytics-summary",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "api::http::get::analytics_summary",
      description: "GET /analytics/summary endpoint",
      workerId: "worker-node",
      namespace: "api",
    },
  },
  {
    id: "fn-api-http-get-system-workers",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "api::http::get::system_workers",
      description: "GET /system/workers endpoint",
      workerId: "worker-node",
      namespace: "api",
    },
  },
  {
    id: "fn-api-http-get-system-functions",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "api::http::get::system_functions",
      description: "GET /system/functions endpoint",
      workerId: "worker-node",
      namespace: "api",
    },
  },
  {
    id: "fn-api-alerts-notify",
    type: "function",
    position: { x: 0, y: 0 },
    data: {
      label: "api::alerts::notify",
      description: "Receive anomaly alerts",
      workerId: "worker-node",
      namespace: "api",
    },
  },
];

/** Ownership edges: worker -> its functions (solid subtle lines) */
const ownershipEdges: Edge[] = [
  // Rust worker owns 3 functions
  {
    id: "own-rust-ingest",
    source: "worker-rust",
    target: "fn-sensors-data-ingest",
    type: "ownership",
  },
  {
    id: "own-rust-validate",
    source: "worker-rust",
    target: "fn-sensors-data-validate",
    type: "ownership",
  },
  {
    id: "own-rust-stats",
    source: "worker-rust",
    target: "fn-sensors-aggregate-stats",
    type: "ownership",
  },
  // Python worker owns 2 functions
  {
    id: "own-python-compute",
    source: "worker-python",
    target: "fn-analytics-stats-compute",
    type: "ownership",
  },
  {
    id: "own-python-detect",
    source: "worker-python",
    target: "fn-analytics-anomaly-detect",
    type: "ownership",
  },
  // Node worker owns 6 functions
  {
    id: "own-node-post-sensors",
    source: "worker-node",
    target: "fn-api-http-post-sensors",
    type: "ownership",
  },
  {
    id: "own-node-get-sensors",
    source: "worker-node",
    target: "fn-api-http-get-sensors-id",
    type: "ownership",
  },
  {
    id: "own-node-get-analytics",
    source: "worker-node",
    target: "fn-api-http-get-analytics-summary",
    type: "ownership",
  },
  {
    id: "own-node-get-workers",
    source: "worker-node",
    target: "fn-api-http-get-system-workers",
    type: "ownership",
  },
  {
    id: "own-node-get-functions",
    source: "worker-node",
    target: "fn-api-http-get-system-functions",
    type: "ownership",
  },
  {
    id: "own-node-alerts",
    source: "worker-node",
    target: "fn-api-alerts-notify",
    type: "ownership",
  },
];

/** Invocation edges: cross-worker data flow (dashed cyan with glow) */
const invocationEdges: Edge[] = [
  {
    id: "inv-post-to-ingest",
    source: "fn-api-http-post-sensors",
    target: "fn-sensors-data-ingest",
    type: "invocation",
  },
  {
    id: "inv-ingest-to-validate",
    source: "fn-sensors-data-ingest",
    target: "fn-sensors-data-validate",
    type: "invocation",
  },
  {
    id: "inv-validate-to-aggregate",
    source: "fn-sensors-data-validate",
    target: "fn-sensors-aggregate-stats",
    type: "invocation",
  },
  {
    id: "inv-aggregate-to-compute",
    source: "fn-sensors-aggregate-stats",
    target: "fn-analytics-stats-compute",
    type: "invocation",
  },
  {
    id: "inv-compute-to-detect",
    source: "fn-analytics-stats-compute",
    target: "fn-analytics-anomaly-detect",
    type: "invocation",
  },
  {
    id: "inv-detect-to-alerts",
    source: "fn-analytics-anomaly-detect",
    target: "fn-api-alerts-notify",
    type: "invocation",
  },
  {
    id: "inv-get-analytics-to-compute",
    source: "fn-api-http-get-analytics-summary",
    target: "fn-analytics-stats-compute",
    type: "invocation",
  },
  {
    id: "inv-get-sensors-to-ingest",
    source: "fn-api-http-get-sensors-id",
    target: "fn-sensors-data-ingest",
    type: "invocation",
  },
];

export const INITIAL_NODES: Node[] = [...workerNodes, ...functionNodes];
export const INITIAL_EDGES: Edge[] = [...ownershipEdges, ...invocationEdges];
