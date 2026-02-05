import { Bridge } from '@iii-dev/sdk'

const ENGINE_URL = process.env.III_ENGINE_URL ?? 'ws://127.0.0.1:49134'

const bridge = new Bridge(ENGINE_URL, {
  otel: { enabled: true, serviceName: 'analytics-workflow', metricsEnabled: true, metricsExportIntervalMs: 5000 },
})

interface AnalyticsInput {
  body?: { dataset?: string; metric?: string; periods?: number }
  dataset?: string
  metric?: string
  periods?: number
}

function unwrap(r: unknown): unknown {
  return r && typeof r === 'object' && 'body' in r ? (r as { body: unknown }).body : r
}

bridge.registerFunction(
  { function_path: 'workflow.fullAnalysis' },
  async (req: AnalyticsInput) => {
    const input = req.body ?? req
    const dataset = input.dataset ?? 'default'
    const periods = input.periods ?? 3

    try {
      const [summary, anomalies] = await Promise.all([
        bridge.invokeFunction('analytics.summary', { dataset }),
        bridge.invokeFunction('analytics.anomalies', { dataset }),
      ])

      const predictions = await bridge.invokeFunction('analytics.predict', { dataset, periods })
      const segments = await bridge.invokeFunction('analytics.segments', { dataset })

      return {
        status_code: 200,
        body: {
          dataset,
          metric: input.metric ?? 'revenue',
          summary: unwrap(summary),
          anomalies: unwrap(anomalies),
          predictions: unwrap(predictions),
          segments: unwrap(segments),
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { status_code: 500, body: { error: message } }
    }
  }
)

bridge.registerTrigger({
  trigger_type: 'api',
  function_path: 'workflow.fullAnalysis',
  config: { api_path: 'analysis/full', http_method: 'POST' },
})

console.log('[Workflow] Full analysis endpoint ready')
console.log('  POST /analysis/full - Orchestrates summary + anomalies + predict + segments')
