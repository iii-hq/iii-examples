#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ENGINE_HTTP="http://localhost:3111"
TIMEOUT=60          # Max seconds to wait for readiness
POLL_INTERVAL=2     # Seconds between readiness polls

# ---------------------------------------------------------------------------
# PID tracking and cleanup
# ---------------------------------------------------------------------------
PIDS=()

cleanup() {
  echo ""
  echo "=== Cleaning up ==="
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "All processes stopped."
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

wait_for_ready() {
  local endpoint="$1"
  local elapsed=0
  echo "Waiting for $endpoint to be ready..."
  while [ "$elapsed" -lt "$TIMEOUT" ]; do
    if curl -sf "$endpoint" >/dev/null 2>&1; then
      echo "  Ready after ${elapsed}s"
      return 0
    fi
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done
  echo "  TIMEOUT after ${TIMEOUT}s waiting for $endpoint"
  return 1
}

wait_for_workers() {
  local elapsed=0
  echo "Waiting for all 3 workers to register..."
  while [ "$elapsed" -lt "$TIMEOUT" ]; do
    local body
    body=$(curl -sf "$ENGINE_HTTP/system/workers" 2>/dev/null) || body=""
    # Count worker entries -- look for worker-identifying patterns in response
    local count
    count=$(echo "$body" | grep -o '"id"' | wc -l | tr -d ' ')
    if [ "$count" -ge 3 ]; then
      echo "  All $count workers registered after ${elapsed}s"
      return 0
    fi
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done
  echo "  TIMEOUT: only found workers in response, expected 3"
  return 1
}

FAILURES=0

test_endpoint() {
  local desc="$1"
  local method="$2"
  local url="$3"
  local body="${4:-}"

  local http_code
  if [ "$method" = "POST" ]; then
    http_code=$(curl -sf -o /dev/null -w "%{http_code}" \
      -X POST -H "Content-Type: application/json" -d "$body" "$url" 2>/dev/null) || http_code="000"
  else
    http_code=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null) || http_code="000"
  fi

  if [[ "$http_code" =~ ^2 ]]; then
    echo "  PASS: $desc (HTTP $http_code)"
  else
    echo "  FAIL: $desc (HTTP $http_code)"
    FAILURES=$((FAILURES + 1))
  fi
}

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
if ! command -v iii >/dev/null 2>&1; then
  echo "ERROR: 'iii' command not found. Install the iii engine first."
  exit 1
fi

# ---------------------------------------------------------------------------
# Start engine
# ---------------------------------------------------------------------------
echo "=== Starting iii engine ==="
iii &
PIDS+=($!)
wait_for_ready "$ENGINE_HTTP/system/workers"

# ---------------------------------------------------------------------------
# Start workers in order
# ---------------------------------------------------------------------------
echo "=== Starting Rust worker (sensors) ==="
(cd "$SCRIPT_DIR/rust-worker" && cargo run 2>&1) &
PIDS+=($!)

echo "=== Starting Python worker (analytics) ==="
(cd "$SCRIPT_DIR/python-worker" && uv run python -m src.main 2>&1) &
PIDS+=($!)

echo "=== Starting Node.js worker (API gateway) ==="
(cd "$SCRIPT_DIR/node-worker" && npx tsx src/index.ts 2>&1) &
PIDS+=($!)

# ---------------------------------------------------------------------------
# Wait for all workers to register
# ---------------------------------------------------------------------------
wait_for_workers

# ---------------------------------------------------------------------------
# Run endpoint tests
# ---------------------------------------------------------------------------
echo ""
echo "=== Testing HTTP endpoints ==="

test_endpoint "POST /sensors/ingest" POST "$ENGINE_HTTP/sensors/ingest" \
  '{"sensor_id":"smoke-001","value":22.0,"unit":"celsius","timestamp":"2026-01-01T00:00:00Z"}'

test_endpoint "GET /sensors/:id" GET "$ENGINE_HTTP/sensors/smoke-001"

test_endpoint "GET /analytics/summary" GET "$ENGINE_HTTP/analytics/summary"

test_endpoint "GET /system/workers" GET "$ENGINE_HTTP/system/workers"

test_endpoint "GET /system/functions" GET "$ENGINE_HTTP/system/functions"

# ---------------------------------------------------------------------------
# Report results
# ---------------------------------------------------------------------------
echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo "=== ALL TESTS PASSED ==="
  exit 0
else
  echo "=== $FAILURES TEST(S) FAILED ==="
  exit 1
fi
