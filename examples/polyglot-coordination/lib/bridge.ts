import { Bridge } from '@iii-dev/sdk'

const ENGINE_URL = process.env.III_ENGINE_URL ?? 'ws://127.0.0.1:49134'

export function createBridge(serviceName: string): Bridge {
  return new Bridge(ENGINE_URL, {
    otel: {
      enabled: true,
      serviceName,
      metricsEnabled: true,
      metricsExportIntervalMs: 5000,
    },
  })
}
