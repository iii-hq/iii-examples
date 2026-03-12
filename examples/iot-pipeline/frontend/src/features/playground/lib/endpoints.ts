export interface EndpointConfig {
  id: string;
  method: "GET" | "POST";
  path: string;
  label: string;
  description: string;
  defaultBody?: string;
  pathParams?: { name: string; placeholder: string; default: string }[];
}

export const ENDPOINTS: EndpointConfig[] = [
  {
    id: "post-sensors-ingest",
    method: "POST",
    path: "/sensors/ingest",
    label: "POST /sensors/ingest",
    description: "Ingest a sensor reading",
    defaultBody: JSON.stringify(
      {
        sensor_id: "temp-001",
        value: 23.5,
        timestamp: new Date().toISOString(),
        sensor_type: "temperature",
        unit: "celsius",
        location: { lat: 40.7128, lon: -74.006 },
      },
      null,
      2,
    ),
  },
  {
    id: "get-sensors-by-id",
    method: "GET",
    path: "/sensors/:id",
    label: "GET /sensors/:id",
    description: "Get sensor readings by ID",
    pathParams: [{ name: "id", placeholder: "Sensor ID", default: "temp-001" }],
  },
  {
    id: "get-analytics-summary",
    method: "GET",
    path: "/analytics/summary",
    label: "GET /analytics/summary",
    description: "Get analytics summary",
  },
  {
    id: "get-system-workers",
    method: "GET",
    path: "/system/workers",
    label: "GET /system/workers",
    description: "List connected workers",
  },
  {
    id: "get-system-functions",
    method: "GET",
    path: "/system/functions",
    label: "GET /system/functions",
    description: "List registered functions",
  },
];

export function getEndpointById(id: string): EndpointConfig | undefined {
  return ENDPOINTS.find((e) => e.id === id);
}
