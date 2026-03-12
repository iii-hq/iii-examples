export type WorkerLanguage = "rust" | "python" | "node";

export interface WorkerInfo {
  id: string;
  name: string;
  language: WorkerLanguage;
  status: "connected" | "disconnected";
  functionCount: number;
}

export interface FunctionInfo {
  id: string;
  name: string;
  namespace: string;
  description: string;
  workerId: string;
}
