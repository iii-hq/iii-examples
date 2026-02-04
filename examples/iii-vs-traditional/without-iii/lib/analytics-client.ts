import { CircuitBreaker } from './circuit-breaker'
import type {
  SummaryResponse, TimeseriesRequest, TimeseriesResponse,
  PredictRequest, PredictResponse, AnomalyRequest, AnomalyResponse,
  SegmentRequest, SegmentResponse, CorrelateRequest, CorrelateResponse,
  ReportRequest, ReportResponse, HealthResponse,
} from './types'

export class AnalyticsClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly timeout: number
  private readonly maxRetries: number
  private readonly breaker: CircuitBreaker

  constructor(baseUrl: string, apiKey: string, timeout = 10000, maxRetries = 3) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.timeout = timeout
    this.maxRetries = maxRetries
    this.breaker = new CircuitBreaker(5, 30000)
  }

  private async request<T>(method: string, path: string, body?: unknown, correlationId?: string): Promise<T> {
    return this.breaker.execute(async () => {
      let lastError: Error | null = null

      const retryLimit = method === 'GET' || method === 'HEAD' ? this.maxRetries : 1
      for (let attempt = 0; attempt < retryLimit; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), this.timeout)
        try {
          const headers: Record<string, string> = {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          }
          if (correlationId) headers['x-correlation-id'] = correlationId

          const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          })

          if (!res.ok) {
            const detail = await res.text()
            throw new Error(`Upstream ${res.status}: ${detail}`)
          }

          return await res.json() as T
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          if (err instanceof DOMException && err.name === 'AbortError') {
            lastError = new Error(`Request timeout after ${this.timeout}ms`)
          }
          if (attempt < retryLimit - 1) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500))
          }
        } finally {
          clearTimeout(timer)
        }
      }

      throw lastError ?? new Error('Request failed')
    })
  }

  async health(correlationId?: string): Promise<HealthResponse> {
    return this.request('GET', '/health', undefined, correlationId)
  }

  async summary(dataset: string, correlationId?: string): Promise<SummaryResponse> {
    return this.request('GET', `/metrics/summary?dataset=${encodeURIComponent(dataset)}`, undefined, correlationId)
  }

  async timeseries(req: TimeseriesRequest, correlationId?: string): Promise<TimeseriesResponse> {
    return this.request('POST', '/metrics/timeseries', req, correlationId)
  }

  async predict(req: PredictRequest, correlationId?: string): Promise<PredictResponse> {
    return this.request('POST', '/predict', req, correlationId)
  }

  async anomalies(req: AnomalyRequest, correlationId?: string): Promise<AnomalyResponse> {
    return this.request('POST', '/anomalies/detect', req, correlationId)
  }

  async segments(req: SegmentRequest, correlationId?: string): Promise<SegmentResponse> {
    return this.request('POST', '/segments', req, correlationId)
  }

  async correlate(req: CorrelateRequest, correlationId?: string): Promise<CorrelateResponse> {
    return this.request('POST', '/correlate', req, correlationId)
  }

  async report(req: ReportRequest, correlationId?: string): Promise<ReportResponse> {
    return this.request('POST', '/report/generate', req, correlationId)
  }

  getCircuitState() {
    return this.breaker.getState()
  }
}
