import { apiClient } from "@/shared/api/client";
import { useCallback } from "react";
import type { EndpointConfig } from "../lib/endpoints";
import { usePlaygroundStore } from "../stores/playground.store";

function resolvePath(endpoint: EndpointConfig, pathParamValues: Record<string, string>): string {
  let resolvedPath = endpoint.path;
  for (const param of endpoint.pathParams ?? []) {
    resolvedPath = resolvedPath.replace(
      `:${param.name}`,
      pathParamValues[param.name] ?? param.default,
    );
  }
  return resolvedPath;
}

export function useSendRequest() {
  const { setResponse, setLoading } = usePlaygroundStore();

  return useCallback(
    async (
      endpoint: EndpointConfig,
      body: string | undefined,
      pathParams: Record<string, string>,
    ) => {
      setLoading(true);
      setResponse(null);
      try {
        const path = resolvePath(endpoint, pathParams);
        const result = await apiClient.request(
          endpoint.method,
          path,
          endpoint.method === "POST" ? body : undefined,
        );
        setResponse({
          status: result.status,
          data: result.data,
          timeMs: result.timeMs,
        });
      } catch (err) {
        setResponse({
          status: 0,
          data: null,
          timeMs: 0,
          error: err instanceof Error ? err.message : "Network error",
        });
      } finally {
        setLoading(false);
      }
    },
    [setResponse, setLoading],
  );
}
