import { RequestPanel } from "./request-panel";
import { ResponsePanel } from "./response-panel";

export function ApiPlayground() {
  return (
    <div className="grid h-full grid-cols-2 gap-2 p-2">
      <RequestPanel />
      <ResponsePanel />
    </div>
  );
}
