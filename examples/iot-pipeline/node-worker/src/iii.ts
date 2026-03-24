import { registerWorker } from 'iii-sdk'

const engineWsUrl = process.env.III_BRIDGE_URL ?? 'ws://localhost:49134'

export const iii = registerWorker(engineWsUrl, {
  otel: {
    enabled: true,
    serviceName: 'iot-api-gateway',
    serviceVersion: '0.1.0',
    metricsEnabled: true,
    metricsExportIntervalMs: 10000,
    reconnectionConfig: { maxRetries: 10 },
  },
})
