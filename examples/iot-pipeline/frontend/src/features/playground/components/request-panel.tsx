import { json } from "@codemirror/lang-json";
import CodeMirror from "@uiw/react-codemirror";
import { Loader2, Send } from "lucide-react";
import { useMemo } from "react";
import { useSendRequest } from "../hooks/use-send-request";
import { ENDPOINTS } from "../lib/endpoints";
import { playgroundTheme } from "../lib/theme";
import { usePlaygroundStore } from "../stores/playground.store";
import { EndpointSelector } from "./endpoint-selector";

export function RequestPanel() {
  const selectedEndpointId = usePlaygroundStore((s) => s.selectedEndpointId);
  const requestBodies = usePlaygroundStore((s) => s.requestBodies);
  const pathParamValues = usePlaygroundStore((s) => s.pathParamValues);
  const isLoading = usePlaygroundStore((s) => s.isLoading);
  const setRequestBody = usePlaygroundStore((s) => s.setRequestBody);
  const setPathParamValue = usePlaygroundStore((s) => s.setPathParamValue);
  const sendRequest = useSendRequest();

  const endpoint = ENDPOINTS.find((e) => e.id === selectedEndpointId);
  const extensions = useMemo(() => [json()], []);

  if (!endpoint) return null;

  const body = requestBodies[endpoint.id] ?? endpoint.defaultBody ?? "";
  const params = pathParamValues[endpoint.id] ?? {};

  const handleSend = () => {
    sendRequest(endpoint, body || undefined, params);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <EndpointSelector />

      {endpoint.method === "GET" && endpoint.pathParams && (
        <div className="flex flex-col gap-1">
          {endpoint.pathParams.map((param) => (
            <div key={param.name} className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-muted">:{param.name}</span>
              <input
                type="text"
                value={params[param.name] ?? param.default}
                onChange={(e) => setPathParamValue(endpoint.id, param.name, e.target.value)}
                placeholder={param.placeholder}
                className="flex-1 rounded border border-border-default bg-bg-elevated px-2 py-1 text-xs font-mono text-text-primary outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      )}

      {endpoint.method === "GET" && !endpoint.pathParams && (
        <div className="rounded border border-border-default bg-bg-elevated px-2 py-1.5">
          <span className="text-xs font-mono text-text-muted">{endpoint.path}</span>
        </div>
      )}

      {endpoint.method === "POST" && (
        <div className="flex-1 min-h-0 overflow-hidden rounded border border-border-default">
          <CodeMirror
            value={body}
            onChange={(val) => setRequestBody(endpoint.id, val)}
            extensions={extensions}
            theme={playgroundTheme}
            height="100%"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              bracketMatching: true,
              closeBrackets: true,
              highlightActiveLine: false,
              autocompletion: false,
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={isLoading}
        className="flex items-center justify-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        {isLoading ? "Sending..." : "Send Request"}
      </button>
    </div>
  );
}
