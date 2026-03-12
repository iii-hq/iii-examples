import { ENDPOINTS } from "../lib/endpoints";
import { usePlaygroundStore } from "../stores/playground.store";

export function EndpointSelector() {
  const selectedEndpointId = usePlaygroundStore((s) => s.selectedEndpointId);
  const setSelectedEndpoint = usePlaygroundStore((s) => s.setSelectedEndpoint);

  const selected = ENDPOINTS.find((e) => e.id === selectedEndpointId);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={selectedEndpointId}
        onChange={(e) => setSelectedEndpoint(e.target.value)}
        className="w-full rounded border border-border-default bg-bg-elevated px-2 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
      >
        {ENDPOINTS.map((ep) => (
          <option key={ep.id} value={ep.id}>
            {ep.label}
          </option>
        ))}
      </select>
      {selected && <span className="text-[10px] text-text-muted">{selected.description}</span>}
    </div>
  );
}
