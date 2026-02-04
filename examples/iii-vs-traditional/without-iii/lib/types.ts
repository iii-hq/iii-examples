export interface SummaryResponse {
  dataset: string
  count: number
  mean: number
  median: number
  stdev: number
  min: number
  max: number
}

export interface TimeseriesRequest {
  dataset?: string
  start?: number
  end?: number
}

export interface TimeseriesResponse {
  dataset: string
  range: [number, number]
  values: number[]
  count: number
}

export interface PredictRequest {
  dataset?: string
  periods?: number
}

export interface PredictResponse {
  dataset: string
  model: string
  slope: number
  intercept: number
  predictions: number[]
}

export interface AnomalyRequest {
  dataset?: string
  threshold?: number
}

export interface Anomaly {
  index: number
  value: number
  z_score: number
}

export interface AnomalyResponse {
  dataset: string
  threshold: number
  anomalies: Anomaly[]
  total_points: number
}

export interface SegmentRequest {
  dataset?: string
  segments?: number
}

export interface Segment {
  segment: number
  range: [number, number]
  count: number
  mean: number
}

export interface SegmentResponse {
  dataset: string
  segments: Segment[]
}

export interface CorrelateRequest {
  dataset_a?: string
  dataset_b?: string
}

export interface CorrelateResponse {
  dataset_a: string
  dataset_b: string
  correlation: number
  strength: string
  points: number
}

export interface ReportRequest {
  dataset?: string
  metric?: string
  periods?: number
}

export interface ReportSummary {
  count: number
  mean: number
  median: number
  stdev: number
  min: number
  max: number
}

export interface ReportResponse {
  dataset: string
  metric: string
  summary: ReportSummary
  predictions: number[]
  anomalies: Anomaly[]
  trend: string
}

export interface HealthResponse {
  status: string
  datasets: string[]
}
