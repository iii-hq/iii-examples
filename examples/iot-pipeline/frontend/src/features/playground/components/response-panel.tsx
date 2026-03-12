import { json } from "@codemirror/lang-json";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";
import { playgroundTheme } from "../lib/theme";
import { usePlaygroundStore } from "../stores/playground.store";
import { StatusBadge } from "./status-badge";

export function ResponsePanel() {
  const response = usePlaygroundStore((s) => s.response);
  const isLoading = usePlaygroundStore((s) => s.isLoading);
  const extensions = useMemo(() => [json()], []);

  if (!response && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-text-muted">Send a request to see the response</p>
      </div>
    );
  }

  if (isLoading && !response) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!response) return null;

  const formatted = response.data ? JSON.stringify(response.data, null, 2) : "";

  return (
    <div className="flex h-full flex-col gap-2">
      <StatusBadge status={response.status} timeMs={response.timeMs} />

      {response.error && <p className="text-xs text-error">{response.error}</p>}

      <div className="flex-1 min-h-0 overflow-hidden rounded border border-border-default">
        <CodeMirror
          value={formatted}
          readOnly={true}
          editable={false}
          extensions={extensions}
          theme={playgroundTheme}
          height="100%"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: false,
          }}
        />
      </div>
    </div>
  );
}
