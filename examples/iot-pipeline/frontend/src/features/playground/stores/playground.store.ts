import { create } from "zustand";

export interface PlaygroundResponse {
  status: number;
  data: unknown;
  timeMs: number;
  error?: string;
}

interface PlaygroundState {
  selectedEndpointId: string;
  requestBodies: Record<string, string>;
  pathParamValues: Record<string, Record<string, string>>;
  response: PlaygroundResponse | null;
  isLoading: boolean;
  setSelectedEndpoint: (id: string) => void;
  setRequestBody: (endpointId: string, body: string) => void;
  setPathParamValue: (endpointId: string, paramName: string, value: string) => void;
  setResponse: (response: PlaygroundResponse | null) => void;
  setLoading: (loading: boolean) => void;
}

export const usePlaygroundStore = create<PlaygroundState>()((set) => ({
  selectedEndpointId: "post-sensors-ingest",
  requestBodies: {},
  pathParamValues: {},
  response: null,
  isLoading: false,
  setSelectedEndpoint: (id) => set({ selectedEndpointId: id, response: null }),
  setRequestBody: (endpointId, body) =>
    set((state) => ({
      requestBodies: { ...state.requestBodies, [endpointId]: body },
    })),
  setPathParamValue: (endpointId, paramName, value) =>
    set((state) => ({
      pathParamValues: {
        ...state.pathParamValues,
        [endpointId]: {
          ...state.pathParamValues[endpointId],
          [paramName]: value,
        },
      },
    })),
  setResponse: (response) => set({ response }),
  setLoading: (isLoading) => set({ isLoading }),
}));
