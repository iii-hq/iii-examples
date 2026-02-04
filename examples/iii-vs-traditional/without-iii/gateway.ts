import express from 'express'
import { AnalyticsClient } from './lib/analytics-client'
import { authMiddleware } from './lib/auth'
import { errorHandler } from './lib/error-handler'
import { HealthChecker } from './lib/health-check'
import { loggerMiddleware } from './lib/logger'

const ANALYTICS_URL = process.env.ANALYTICS_URL ?? 'http://localhost:4000'
const ANALYTICS_KEY = process.env.ANALYTICS_API_KEY ?? 'analytics-key-123'
const PORT = Number(process.env.PORT ?? 5000)

const client = new AnalyticsClient(ANALYTICS_URL, ANALYTICS_KEY)
const healthChecker = new HealthChecker(ANALYTICS_URL)
const app = express()

app.use(express.json())
app.use(loggerMiddleware)

app.get('/health', (_req, res) => {
  res.json({
    gateway: 'healthy',
    upstream: healthChecker.isHealthy(),
    circuit: client.getCircuitState(),
  })
})

app.use(authMiddleware)

app.get('/analytics/summary', async (req, res, next) => {
  try {
    const cid = (req as Record<string, unknown>).correlationId as string
    const result = await client.summary(String(req.query.dataset ?? 'default'), cid)
    res.json(result)
  } catch (err) { next(err) }
})

app.post('/analytics/timeseries', async (req, res, next) => {
  try {
    const cid = (req as Record<string, unknown>).correlationId as string
    const result = await client.timeseries(req.body, cid)
    res.json(result)
  } catch (err) { next(err) }
})

app.post('/analytics/predict', async (req, res, next) => {
  try {
    const cid = (req as Record<string, unknown>).correlationId as string
    const result = await client.predict(req.body, cid)
    res.json(result)
  } catch (err) { next(err) }
})

app.post('/analytics/anomalies', async (req, res, next) => {
  try {
    const cid = (req as Record<string, unknown>).correlationId as string
    const result = await client.anomalies(req.body, cid)
    res.json(result)
  } catch (err) { next(err) }
})

app.post('/analytics/segments', async (req, res, next) => {
  try {
    const cid = (req as Record<string, unknown>).correlationId as string
    const result = await client.segments(req.body, cid)
    res.json(result)
  } catch (err) { next(err) }
})

app.post('/analytics/correlate', async (req, res, next) => {
  try {
    const cid = (req as Record<string, unknown>).correlationId as string
    const result = await client.correlate(req.body, cid)
    res.json(result)
  } catch (err) { next(err) }
})

app.post('/analytics/report', async (req, res, next) => {
  try {
    const cid = (req as Record<string, unknown>).correlationId as string
    const dataset = req.body.dataset ?? 'default'
    const periods = req.body.periods ?? 3

    const [summaryResult, anomalyResult] = await Promise.all([
      client.summary(dataset, cid),
      client.anomalies({ dataset }, cid),
    ])

    const predictResult = await client.predict({ dataset, periods }, cid)
    const segmentResult = await client.segments({ dataset }, cid)

    res.json({
      dataset,
      metric: req.body.metric ?? 'revenue',
      summary: summaryResult,
      anomalies: anomalyResult,
      predictions: predictResult,
      segments: segmentResult,
    })
  } catch (err) { next(err) }
})

app.use(errorHandler)

healthChecker.start()

app.listen(PORT, () => {
  console.log(`[Gateway] Running on http://localhost:${PORT}`)
  console.log('  GET  /health')
  console.log('  GET  /analytics/summary')
  console.log('  POST /analytics/timeseries')
  console.log('  POST /analytics/predict')
  console.log('  POST /analytics/anomalies')
  console.log('  POST /analytics/segments')
  console.log('  POST /analytics/correlate')
  console.log('  POST /analytics/report')
})
