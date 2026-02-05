# iii vs Traditional

Side-by-side comparison: connect a Python analytics service using **iii Engine** (~120 lines) vs a **traditional REST gateway** (~465 lines).

Both approaches integrate the same Python service. You run the analytics service once, then try each path.

## File Structure

```
iii-vs-traditional/
├── analytics-service/       # Shared Python analytics API
│   ├── main.py              # FastAPI with 8 endpoints (port 4000)
│   ├── requirements.txt
│   └── mock-server.ts       # Node.js fallback (no Python needed)
├── with-iii/                # iii Engine approach (~120 lines)
│   ├── bridge-worker.ts     # Auto-registers all 8 endpoints
│   └── workflow.ts          # Orchestrates "full analysis"
└── without-iii/             # Traditional approach (~465 lines)
    ├── gateway.ts           # Express gateway
    └── lib/
        ├── types.ts         # Manually maintained TypeScript types
        ├── analytics-client.ts  # HTTP client + retries + circuit breaker
        ├── circuit-breaker.ts   # Circuit breaker pattern
        ├── auth.ts              # API key middleware
        ├── error-handler.ts     # Error mapping layer
        ├── health-check.ts      # Upstream health polling
        └── logger.ts            # Request logging middleware
```

## Analytics Service

FastAPI service on port 4000 with API key auth (`analytics-key-123`).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/metrics/summary` | GET | Summary stats for a dataset |
| `/metrics/timeseries` | POST | Time series data |
| `/predict` | POST | ML prediction (linear regression) |
| `/anomalies/detect` | POST | Anomaly detection |
| `/segments` | POST | Customer segmentation |
| `/correlate` | POST | Metric correlation |
| `/report/generate` | POST | Full report |

Built-in datasets: `default`, `sales`, `traffic`. Uses only Python stdlib (`statistics`, `math`) + FastAPI/Pydantic.

## Running the Example

### Step 1: Start the Analytics Service

You need the analytics service running for both approaches. Pick one:

**Option A — Python:**

```bash
cd analytics-service
pip install -r requirements.txt
uvicorn main:app --port 4000
```

**Option B — Bun (no Python needed):**

```bash
cd analytics-service
bun run mock-server.ts
```

Verify it's running:

```bash
curl http://localhost:4000/health
# {"status":"healthy","datasets":["default","sales","traffic"]}
```

### Step 2a: with-iii (iii Engine approach)

Open 3 terminals:

```bash
# Terminal 1: Start iii Engine
iii

# Terminal 2: Start the bridge + workflow
cd with-iii
pnpm install
pnpm dev
```

You should see all 8 endpoints registered and the workflow ready.

**Test individual endpoints:**

```bash
# Summary stats
curl 'http://localhost:3111/analytics/summary?dataset=sales'

# Predictions
curl -X POST http://localhost:3111/analytics/predict \
  -H 'Content-Type: application/json' \
  -d '{"dataset":"default","periods":3}'

# Anomaly detection
curl -X POST http://localhost:3111/analytics/anomalies \
  -H 'Content-Type: application/json' \
  -d '{"dataset":"traffic","threshold":1.5}'

# Correlation between datasets
curl -X POST http://localhost:3111/analytics/correlate \
  -H 'Content-Type: application/json' \
  -d '{"dataset_a":"default","dataset_b":"sales"}'
```

**Test the orchestrated workflow (calls 4 endpoints, 2 in parallel):**

```bash
curl -X POST http://localhost:3111/analysis/full \
  -H 'Content-Type: application/json' \
  -d '{"dataset":"sales","metric":"revenue","periods":5}'
```

Expected response includes `summary`, `anomalies`, `predictions`, and `segments` fields.

### Step 2b: without-iii (Traditional gateway)

```bash
cd without-iii
pnpm install
pnpm dev
```

> **Note:** macOS port 5000 may be taken by AirPlay Receiver. Use `PORT=5050 pnpm dev` if so.

**Test individual endpoints (requires `x-api-key` header):**

```bash
# Health check (no auth required)
curl http://localhost:5000/health

# Summary stats
curl 'http://localhost:5000/analytics/summary?dataset=sales' \
  -H 'x-api-key: gateway-key-456'

# Predictions
curl -X POST http://localhost:5000/analytics/predict \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: gateway-key-456' \
  -d '{"dataset":"default","periods":3}'

# Anomaly detection
curl -X POST http://localhost:5000/analytics/anomalies \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: gateway-key-456' \
  -d '{"dataset":"traffic","threshold":1.5}'
```

**Test the orchestrated report (calls 4 endpoints, 2 in parallel):**

```bash
curl -X POST http://localhost:5000/analytics/report \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: gateway-key-456' \
  -d '{"dataset":"sales","metric":"revenue","periods":5}'
```

**Test error handling:**

```bash
# Missing API key
curl http://localhost:5000/analytics/summary?dataset=default
# {"error":"Unauthorized: invalid or missing x-api-key"}

# Bad dataset
curl 'http://localhost:5000/analytics/summary?dataset=nonexistent' \
  -H 'x-api-key: gateway-key-456'
# {"error":"Not found","detail":"Upstream 404: ..."}
```

## Comparison

| Concern | with-iii | without-iii |
|---------|----------|-------------|
| Files | 2 | 8 |
| Lines of code | ~120 | ~465 |
| Retries | Built into iii engine | Manual exponential backoff |
| Circuit breaker | Built into iii engine | Custom implementation |
| Health checks | iii engine monitors | Custom polling logic |
| Request tracing | OTEL built-in | Manual correlation IDs |
| Error mapping | Automatic | Custom error handler |
| Adding new endpoint | 1 entry in array | Route + client method + types |

### Adding a New Endpoint

**with-iii** - add 1 entry to the array:

```typescript
{ name: 'forecast', path: '/forecast', method: 'POST' as const },
```

**without-iii** - update 3+ files:

1. Add TypeScript interfaces in `lib/types.ts`
2. Add client method in `lib/analytics-client.ts`
3. Add route handler in `gateway.ts`
