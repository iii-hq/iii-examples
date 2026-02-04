import { Bridge } from '@iii-dev/sdk'

const ENGINE_URL = process.env.III_ENGINE_URL ?? 'ws://127.0.0.1:49134'
const ANALYTICS_URL = process.env.ANALYTICS_URL ?? 'http://localhost:4000'
const API_KEY = process.env.ANALYTICS_API_KEY ?? 'analytics-key-123'

const bridge = new Bridge(ENGINE_URL, {
  otel: { enabled: true, serviceName: 'analytics-bridge', metricsEnabled: true, metricsExportIntervalMs: 5000 },
})

const endpoints = [
  { name: 'health',     path: '/health',           method: 'GET'  as const },
  { name: 'summary',    path: '/metrics/summary',  method: 'GET'  as const },
  { name: 'timeseries', path: '/metrics/timeseries', method: 'POST' as const },
  { name: 'predict',    path: '/predict',          method: 'POST' as const },
  { name: 'anomalies',  path: '/anomalies/detect', method: 'POST' as const },
  { name: 'segments',   path: '/segments',         method: 'POST' as const },
  { name: 'correlate',  path: '/correlate',        method: 'POST' as const },
  { name: 'report',     path: '/report/generate',  method: 'POST' as const },
]

async function callAnalytics(path: string, method: string, input?: unknown): Promise<{ status: number; data: unknown }> {
  const url = new URL(path, ANALYTICS_URL)
  if (method === 'GET' && input && typeof input === 'object') {
    for (const [k, v] of Object.entries(input as Record<string, string>)) {
      url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url, {
    method,
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(input) : undefined,
  })
  const data = await res.json()
  return { status: res.status, data }
}

for (const ep of endpoints) {
  const functionPath = `analytics.${ep.name}`

  bridge.registerFunction(
    { function_path: functionPath },
    async (input) => {
      const isApiTrigger = input?.trigger?.type === 'api'
      const data = isApiTrigger
        ? (ep.method === 'GET' ? input.query_params : input.body)
        : input
      const { status, data: result } = await callAnalytics(ep.path, ep.method, data)
      return { status_code: status, body: result }
    }
  )

  bridge.registerTrigger({
    trigger_type: 'api',
    function_path: functionPath,
    config: { api_path: `analytics/${ep.name}`, http_method: ep.method },
  })

  console.log(`  registered analytics.${ep.name} [${ep.method} /analytics/${ep.name}]`)
}

console.log('[Bridge] All 8 analytics endpoints registered')
