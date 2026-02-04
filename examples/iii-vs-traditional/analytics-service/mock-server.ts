const API_KEY = 'analytics-key-123'

const DATASETS: Record<string, number[]> = {
  default: [120, 135, 128, 142, 155, 149, 160, 172, 168, 180, 175, 190],
  sales: [45, 52, 48, 61, 58, 72, 68, 75, 82, 79, 88, 95],
  traffic: [1200, 1350, 1100, 1450, 1600, 1380, 1520, 1700, 1650, 1800, 1750, 1900],
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1))
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function getData(name: string): number[] | null {
  return DATASETS[name] ?? null
}

function linearRegression(data: number[]) {
  const n = data.length
  const xMean = (n - 1) / 2
  const yMean = mean(data)
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (data[i] - yMean)
    den += (i - xMean) ** 2
  }
  const slope = den !== 0 ? num / den : 0
  const intercept = yMean - slope * xMean
  return { slope, intercept }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function checkAuth(req: Request): Response | null {
  if (req.headers.get('x-api-key') !== API_KEY) {
    return json(401, { detail: 'Invalid API key' })
  }
  return null
}

const server = Bun.serve({
  port: 4000,
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname

    if (path === '/health' && req.method === 'GET') {
      return json(200, { status: 'healthy', datasets: Object.keys(DATASETS) })
    }

    const authErr = checkAuth(req)
    if (authErr) return authErr

    if (path === '/metrics/summary' && req.method === 'GET') {
      const dataset = url.searchParams.get('dataset') ?? 'default'
      const data = getData(dataset)
      if (!data) return json(404, { detail: `Dataset '${dataset}' not found` })
      return json(200, {
        dataset, count: data.length, mean: +mean(data).toFixed(2),
        median: +median(data).toFixed(2), stdev: +stdev(data).toFixed(2),
        min: Math.min(...data), max: Math.max(...data),
      })
    }

    if (path === '/metrics/timeseries' && req.method === 'POST') {
      const body = await req.json() as { dataset?: string; start?: number; end?: number }
      const dataset = body.dataset ?? 'default'
      const data = getData(dataset)
      if (!data) return json(404, { detail: `Dataset '${dataset}' not found` })
      const start = body.start ?? 0
      const end = body.end ?? data.length
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
        return json(400, { detail: 'Invalid range: expected 0 <= start <= end' })
      }
      const sliced = data.slice(start, end)
      return json(200, { dataset, range: [start, end], values: sliced, count: sliced.length })
    }

    if (path === '/predict' && req.method === 'POST') {
      const body = await req.json() as { dataset?: string; periods?: number }
      const dataset = body.dataset ?? 'default'
      const data = getData(dataset)
      if (!data) return json(404, { detail: `Dataset '${dataset}' not found` })
      const periods = body.periods ?? 3
      if (!Number.isFinite(periods) || periods < 0) {
        return json(400, { detail: 'Invalid periods: expected non-negative number' })
      }
      const { slope, intercept } = linearRegression(data)
      const predictions = Array.from({ length: periods }, (_, i) =>
        +(slope * (data.length + i) + intercept).toFixed(2)
      )
      return json(200, {
        dataset, model: 'linear_regression',
        slope: +slope.toFixed(4), intercept: +intercept.toFixed(4), predictions,
      })
    }

    if (path === '/anomalies/detect' && req.method === 'POST') {
      const body = await req.json() as { dataset?: string; threshold?: number }
      const dataset = body.dataset ?? 'default'
      const data = getData(dataset)
      if (!data) return json(404, { detail: `Dataset '${dataset}' not found` })
      const threshold = body.threshold ?? 2.0
      const m = mean(data), s = stdev(data)
      const anomalies: { index: number; value: number; z_score: number }[] = []
      if (s > 0) {
        data.forEach((val, i) => {
          const z = Math.abs(val - m) / s
          if (z > threshold) anomalies.push({ index: i, value: val, z_score: +z.toFixed(2) })
        })
      }
      return json(200, { dataset, threshold, anomalies, total_points: data.length })
    }

    if (path === '/segments' && req.method === 'POST') {
      const body = await req.json() as { dataset?: string; segments?: number }
      const dataset = body.dataset ?? 'default'
      const data = getData(dataset)
      if (!data) return json(404, { detail: `Dataset '${dataset}' not found` })
      const numSegments = body.segments ?? 3
      const sorted = [...data].sort((a, b) => a - b)
      const chunkSize = Math.max(1, Math.floor(sorted.length / numSegments))
      const groups: { segment: number; range: number[]; count: number; mean: number }[] = []
      for (let i = 0; i < numSegments; i++) {
        const start = i * chunkSize
        const end = i < numSegments - 1 ? start + chunkSize : sorted.length
        const chunk = sorted.slice(start, end)
        if (chunk.length > 0) {
          groups.push({
            segment: i + 1, range: [chunk[0], chunk[chunk.length - 1]],
            count: chunk.length, mean: +mean(chunk).toFixed(2),
          })
        }
      }
      return json(200, { dataset, segments: groups })
    }

    if (path === '/correlate' && req.method === 'POST') {
      const body = await req.json() as { dataset_a?: string; dataset_b?: string }
      const nameA = body.dataset_a ?? 'default', nameB = body.dataset_b ?? 'sales'
      const a = getData(nameA), b = getData(nameB)
      if (!a) return json(404, { detail: `Dataset '${nameA}' not found` })
      if (!b) return json(404, { detail: `Dataset '${nameB}' not found` })
      const n = Math.min(a.length, b.length)
      const sa = a.slice(0, n), sb = b.slice(0, n)
      const ma = mean(sa), mb = mean(sb)
      const cov = sa.reduce((s, x, i) => s + (x - ma) * (sb[i] - mb), 0) / n
      const stdA = stdev(sa), stdB = stdev(sb)
      const r = stdA > 0 && stdB > 0 ? cov / (stdA * stdB) : 0
      let strength = 'weak'
      if (Math.abs(r) > 0.7) strength = 'strong'
      else if (Math.abs(r) > 0.4) strength = 'moderate'
      return json(200, { dataset_a: nameA, dataset_b: nameB, correlation: +r.toFixed(4), strength, points: n })
    }

    if (path === '/report/generate' && req.method === 'POST') {
      const body = await req.json() as { dataset?: string; metric?: string; periods?: number }
      const dataset = body.dataset ?? 'default'
      const data = getData(dataset)
      if (!data) return json(404, { detail: `Dataset '${dataset}' not found` })
      const metric = body.metric ?? 'revenue'
      const periods = body.periods ?? 3
      if (!Number.isFinite(periods) || periods < 0) {
        return json(400, { detail: 'Invalid periods: expected non-negative number' })
      }
      const m = mean(data), s = stdev(data), med = median(data)
      const { slope, intercept } = linearRegression(data)
      const predictions = Array.from({ length: periods }, (_, i) =>
        +(slope * (data.length + i) + intercept).toFixed(2)
      )
      const anomalies: { index: number; value: number; z_score: number }[] = []
      if (s > 0) {
        data.forEach((val, i) => {
          const z = Math.abs(val - m) / s
          if (z > 2.0) anomalies.push({ index: i, value: val, z_score: +z.toFixed(2) })
        })
      }
      return json(200, {
        dataset, metric,
        summary: { count: data.length, mean: +m.toFixed(2), median: +med.toFixed(2), stdev: +s.toFixed(2), min: Math.min(...data), max: Math.max(...data) },
        predictions, anomalies,
        trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
      })
    }

    return json(404, { detail: 'Not found' })
  },
})

console.log(`[Mock Analytics] Running on http://localhost:${server.port}`)
