import { iii } from './iii'
import type { ApiResponse } from 'iii-sdk'
import { Logger } from 'iii-sdk'
import { ThresholdTriggerHandler } from './triggers/threshold'

const logger = new Logger(undefined, 'iot-api-gateway')

// ---------- Custom trigger type registration ----------

const thresholdHandler = new ThresholdTriggerHandler()
iii.registerTriggerType(
  { id: 'threshold', description: 'Fires when sensor reading exceeds configured threshold' },
  thresholdHandler,
)

// ---------- Placeholder function registrations ----------

iii.registerFunction({ id: 'api::alerts::notify' }, async (input) => {
  try {
    const { sensor_id, severity, message, reading, z_score } = input
    const alert = { sensor_id, severity, message, reading, z_score, received_at: new Date().toISOString() }

    logger.info('Alert received', { sensor_id, severity })

    await iii.call('state::set', { scope: 'alerts', key: sensor_id + '-' + Date.now(), value: alert })

    await iii.call('stream::set', {
      stream_name: 'alerts',
      group_id: sensor_id,
      item_id: `${sensor_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      data: { sensor_id, severity, message, z_score, timestamp: new Date().toISOString() },
    })

    const threshold = await iii.call('state::get', { scope: 'alert_thresholds', key: sensor_id })
    if (threshold) {
      logger.info('Threshold config', { sensor_id, threshold })
    }

    return { status: 'stored', alert }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to store alert'
    return { status: 'error', error: message }
  }
})

// ---------- Sensor HTTP endpoint handlers ----------

iii.registerFunction({ id: 'api::http::post::sensors' }, async (input): Promise<ApiResponse> => {
  try {
    const body = input.body ?? input
    logger.info('Sensor ingest request received', { body })
    const result = await iii.call<unknown, Record<string, unknown>>('sensors::data::ingest', body)

    const errors = result?.errors
    if (errors && Array.isArray(errors) && errors.length > 0) {
      logger.warn('Sensor validation failed', { errors })
      return { status_code: 400, body: { errors } }
    }

    const reading = result?.reading as Record<string, unknown> | undefined
    logger.info('Sensor ingest completed', { sensor_id: reading?.sensor_id })

    // Write function call event to engine streams for real-time dashboard edge animations
    iii.call('stream::set', {
      stream_name: 'events',
      group_id: 'function_calls',
      item_id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      data: { type: 'function_call', function_id: 'sensors::data::ingest', source: 'api::http::post::sensors', timestamp: Date.now() },
    }).catch(() => {})

    // Check threshold triggers (fire-and-forget)
    const sensorId = reading?.sensor_id as string | undefined
    const value = reading?.value as number | undefined
    if (sensorId && typeof value === 'number') {
      thresholdHandler.checkReading(sensorId, value, iii)
      iii.call('stream::set', {
        stream_name: 'events',
        group_id: 'function_calls',
        item_id: `fc-${Date.now()}-threshold-${Math.random().toString(36).slice(2, 8)}`,
        data: { type: 'function_call', function_id: 'analytics::anomaly::detect', source: 'sensors::data::ingest', timestamp: Date.now() },
      }).catch(() => {})
    }

    return { status_code: 200, body: result as Record<string, unknown> }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return { status_code: 500, body: { error: message } }
  }
})

iii.registerFunction({ id: 'api::http::get::sensors_id' }, async (input): Promise<ApiResponse> => {
  try {
    const sensorId = input.path_params?.id ?? input.sensor_id
    logger.info('Sensor read request', { sensor_id: sensorId })
    if (!sensorId) {
      return { status_code: 400, body: { error: 'Missing sensor id' } }
    }

    const reading = await iii.call('stream::get', {
      stream_name: 'readings',
      group_id: sensorId,
      item_id: 'latest',
    })

    if (reading == null || (typeof reading === 'object' && Object.keys(reading).length === 0)) {
      return { status_code: 404, body: { error: 'Sensor not found' } }
    }

    return { status_code: 200, body: { sensor_id: sensorId, reading } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return { status_code: 500, body: { error: message } }
  }
})

// ---------- Remaining placeholder handlers ----------

iii.registerFunction({ id: 'api::http::get::analytics_summary' }, async (input): Promise<ApiResponse> => {
  try {
    const sensorId = input?.query_params?.sensor_id ?? input?.sensor_id ?? null
    logger.info('Analytics summary request', { sensor_id: sensorId })
    const payload = sensorId ? { sensor_id: sensorId } : {}
    const stats = await iii.call<unknown, Record<string, unknown>>('analytics::stats::compute', payload)

    return { status_code: 200, body: { stats } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return { status_code: 500, body: { error: message } }
  }
})

iii.registerFunction({ id: 'api::http::get::system_workers' }, async (): Promise<ApiResponse> => {
  try {
    logger.info('System workers list request')
    const result = await iii.call<Record<string, never>, { workers: unknown[] }>('engine::workers::list', {} as Record<string, never>)
    return { status_code: 200, body: { workers: result.workers } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list workers'
    return { status_code: 500, body: { error: message } }
  }
})

iii.registerFunction({ id: 'api::http::get::system_functions' }, async (): Promise<ApiResponse> => {
  try {
    logger.info('System functions list request')
    const functions = await iii.listFunctions()
    return { status_code: 200, body: { functions } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list functions'
    return { status_code: 500, body: { error: message } }
  }
})

// ---------- HTTP trigger registrations ----------

iii.registerTrigger({
  type: 'http',
  function_id: 'api::http::post::sensors',
  config: { api_path: '/sensors/ingest', http_method: 'POST' },
})

iii.registerTrigger({
  type: 'http',
  function_id: 'api::http::get::sensors_id',
  config: { api_path: '/sensors/:id', http_method: 'GET' },
})

iii.registerTrigger({
  type: 'http',
  function_id: 'api::http::get::analytics_summary',
  config: { api_path: '/analytics/summary', http_method: 'GET' },
})

iii.registerTrigger({
  type: 'http',
  function_id: 'api::http::get::system_workers',
  config: { api_path: '/system/workers', http_method: 'GET' },
})

iii.registerTrigger({
  type: 'http',
  function_id: 'api::http::get::system_functions',
  config: { api_path: '/system/functions', http_method: 'GET' },
})

// ---------- Peer discovery ----------

const EXPECTED_PEERS = new Set([
  'sensors::data::ingest',
  'sensors::data::validate',
  'sensors::aggregate::stats',
  'analytics::stats::compute',
  'analytics::anomaly::detect',
])

const discoveredIds = new Set<string>()
let peersReady = false

iii.onFunctionsAvailable((functions) => {
  iii.call('stream::set', {
    stream_name: 'events',
    group_id: 'worker_status',
    item_id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data: { type: 'worker_status', event: 'functions_available', functions: functions.map((f: { function_id: string }) => f.function_id), timestamp: Date.now() },
  }).catch(() => {})

  for (const fn of functions) {
    if (EXPECTED_PEERS.has(fn.function_id) && !discoveredIds.has(fn.function_id)) {
      discoveredIds.add(fn.function_id)
      logger.info('Discovered peer function', { function_id: fn.function_id })
    }
  }
  if (!peersReady && EXPECTED_PEERS.size > 0 &&
      [...EXPECTED_PEERS].every((id) => discoveredIds.has(id))) {
    peersReady = true
    logger.info('All peers ready', { peers: [...discoveredIds] })

    // Update worker metadata with peer readiness (best-effort)
    iii.call('state::set', {
      scope: 'worker_metadata',
      key: 'iot-api-gateway',
      value: {
        name: 'iot-api-gateway',
        version: '0.1.0',
        started_at: new Date().toISOString(),
        peers_ready_at: new Date().toISOString(),
        peers: [...discoveredIds],
      },
    }).catch(() => {}) // best-effort update
  }
})

// ---------- Startup ----------

setTimeout(() => {
  if (!peersReady) {
    logger.warn('Timeout: not all peers discovered after 30s', { found: [...discoveredIds] })
  }
}, 30_000)

// ---------- Default alert thresholds ----------

const DEFAULT_THRESHOLDS: Record<string, { z_score_threshold: number }> = {
  'temp-001': { z_score_threshold: 2.5 },
  'temp-002': { z_score_threshold: 2.5 },
  'humidity-001': { z_score_threshold: 3.0 },
  'humidity-002': { z_score_threshold: 3.0 },
  'pressure-001': { z_score_threshold: 3.0 },
}

// Initialize default thresholds in state and register threshold triggers for each sensor
for (const [sensorId, config] of Object.entries(DEFAULT_THRESHOLDS)) {
  iii.call('state::set', { scope: 'alert_thresholds', key: sensorId, value: config })
    .catch((err: Error) => logger.warn('Failed to set default threshold', { sensor_id: sensorId, error: err.message }))

  iii.registerTrigger({
    type: 'threshold',
    function_id: 'api::alerts::notify',
    config: { sensor_id: sensorId, threshold: config.z_score_threshold * 20 },
  })
}

// Store worker metadata in engine state (XCUT-05)
iii.call('state::set', {
  scope: 'worker_metadata',
  key: 'iot-api-gateway',
  value: {
    name: 'iot-api-gateway',
    version: '0.1.0',
    started_at: new Date().toISOString(),
    endpoints: [
      'POST /sensors/ingest',
      'GET /sensors/:id',
      'GET /analytics/summary',
      'GET /system/workers',
      'GET /system/functions',
    ],
  },
}).catch((err: Error) => logger.warn('Failed to store worker metadata', { error: err.message }))

logger.info('Worker started', {
  endpoints: [
    'POST /sensors/ingest -> sensors::data::ingest (Rust)',
    'GET  /sensors/:id    -> stream::get(default)',
    'GET  /analytics/summary -> analytics::stats::compute (Python)',
    'GET  /system/workers -> engine::workers::list',
    'GET  /system/functions -> engine::functions::list',
    'api::alerts::notify  <- Python anomaly alerts (no HTTP trigger)',
    'threshold trigger    <- fires on extreme sensor readings',
  ],
})
