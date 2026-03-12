# Function IDs -- IoT Pipeline

Single source of truth for all function IDs registered across the three workers.
All function IDs use `::` separator. Format: `namespace::group::action`.

**Startup order:** Engine -> Rust (rust-worker) -> Python (python-worker) -> Node.js (node-worker)

## Sensor Worker (Rust) -- sensors::*

| Function ID | Description | Phase |
|-------------|-------------|-------|
| sensors::data::ingest | Accept raw sensor JSON, return validated SensorReading struct | 2 |
| sensors::data::validate | Validate sensor data format, return errors for invalid payloads | 2 |
| sensors::aggregate::stats | Atomic aggregation: increment counts, merge stats | 2 |

## Analytics Worker (Python) -- analytics::*

| Function ID | Description | Phase |
|-------------|-------------|-------|
| analytics::stats::compute | Compute min/max/avg/count per sensor from ring buffer | 3 |
| analytics::anomaly::detect | Z-score anomaly detection, returns is_anomaly boolean | 3 |

## API Gateway Worker (Node.js) -- api::*

| Function ID | Description | Phase |
|-------------|-------------|-------|
| api::http::post::sensors | POST /sensors/ingest -- invokes sensors::data::ingest | 4 |
| api::http::get::sensors_id | GET /sensors/:id -- reads sensor stream data | 4 |
| api::http::get::analytics_summary | GET /analytics/summary -- invokes analytics::stats::compute | 4 |
| api::http::get::system_workers | GET /system/workers -- calls engine::workers::list | 4 |
| api::http::get::system_functions | GET /system/functions -- calls engine::functions::list | 4 |
| api::alerts::notify | Receive anomaly alerts from Python, store in state | 4 |

## Naming Convention Rules

1. Separator: `::` everywhere (Rust, Python, Node.js)
2. Format: `namespace::group::action` (three levels)
3. HTTP triggers include the method: `api::http::{method}::{resource}`
4. Namespaces: `sensors` (Rust), `analytics` (Python), `api` (Node.js)
5. No dots (`.`) -- the Python SDK default of `.` is overridden in this project
