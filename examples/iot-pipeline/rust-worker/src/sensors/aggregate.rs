use iii_sdk::{IIIError, Streams, UpdateBuilder, UpdateOp, UpdateResult};
use serde_json::{json, Value};

use super::models::SensorReading;

/// Build the list of UpdateOps for atomic stats aggregation.
///
/// Uses `UpdateBuilder` with `increment("count", 1)` and `merge` for
/// min/max/sum/last_value/last_updated. When `current_stats` is None
/// (first reading), defaults are f64::MAX for min, f64::MIN for max, 0.0 for sum.
pub fn update_stats_ops(reading: &SensorReading, current_stats: Option<&Value>) -> Vec<UpdateOp> {
    let (cur_min, cur_max, cur_sum) = if let Some(stats) = current_stats {
        (
            stats
                .get("min")
                .and_then(|v| v.as_f64())
                .unwrap_or(f64::MAX),
            stats
                .get("max")
                .and_then(|v| v.as_f64())
                .unwrap_or(f64::MIN),
            stats
                .get("sum")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
        )
    } else {
        (f64::MAX, f64::MIN, 0.0)
    };

    let new_min = cur_min.min(reading.value);
    let new_max = cur_max.max(reading.value);
    let new_sum = cur_sum + reading.value;

    UpdateBuilder::new()
        .increment("count", 1)
        .merge(json!({
            "min": new_min,
            "max": new_max,
            "sum": new_sum,
            "last_value": reading.value,
            "last_updated": reading.timestamp,
        }))
        .build()
}

/// Perform a two-step read-then-write stats update on the stats stream.
///
/// Step 1: Read current stats via an empty update to get `old_value`.
/// Step 2: Compute ops using `update_stats_ops` with context, then apply.
///
/// Note: min/max are approximate under concurrency (read-modify-write race).
/// Acceptable for this example per CONTEXT.md decision.
pub async fn update_stats(
    streams: &Streams,
    reading: &SensorReading,
) -> Result<UpdateResult, IIIError> {
    let key = format!("stats::{}::current", reading.sensor_id);

    // Step 1: Read current stats by sending an empty update
    let read_result = streams.update(&key, vec![]).await?;
    let current_stats = read_result.new_value.as_object().and_then(|_| Some(&read_result.new_value));

    // Step 2: Compute ops with context and apply
    let ops = update_stats_ops(reading, current_stats);
    streams.update(key, ops).await
}

/// Handler for `sensors::aggregate::stats` -- external invocation endpoint.
///
/// Extracts sensor_id from input and returns a status response.
/// The actual aggregation is called from ingest, not from this handler directly.
pub async fn handle_stats(input: Value) -> Result<Value, IIIError> {
    let sensor_id = input
        .get("sensor_id")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    eprintln!("[sensors::aggregate::stats] invoked for sensor_id={sensor_id}");

    Ok(json!({
        "status": "ok",
        "sensor_id": sensor_id,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn make_reading(value: f64) -> SensorReading {
        serde_json::from_value(json!({
            "sensor_id": "temp-001",
            "value": value,
            "timestamp": "2026-03-11T10:00:00Z",
            "unit": "celsius",
            "sensor_type": "temperature",
            "location": { "lat": 40.7128, "lon": -74.0060 }
        }))
        .unwrap()
    }

    #[test]
    fn update_stats_ops_initial_reading_produces_correct_ops() {
        let reading = make_reading(25.0);
        let ops = update_stats_ops(&reading, None);

        // Should have 2 ops: increment and merge
        assert_eq!(ops.len(), 2, "expected 2 ops (increment + merge), got {}", ops.len());

        // Serialize to check structure
        let ops_json: Vec<Value> = ops.iter().map(|op| serde_json::to_value(op).unwrap()).collect();

        // First op: increment count by 1
        assert_eq!(ops_json[0]["type"], "increment");
        assert_eq!(ops_json[0]["by"], 1);

        // Second op: merge with min=25, max=25, sum=25
        assert_eq!(ops_json[1]["type"], "merge");
        let merge_value = &ops_json[1]["value"];
        assert_eq!(merge_value["min"], 25.0);
        assert_eq!(merge_value["max"], 25.0);
        assert_eq!(merge_value["sum"], 25.0);
        assert_eq!(merge_value["last_value"], 25.0);
        assert_eq!(merge_value["last_updated"], "2026-03-11T10:00:00Z");
    }

    #[test]
    fn update_stats_ops_with_prior_stats_computes_min_max_sum() {
        let reading = make_reading(30.0);
        let prior = json!({
            "min": 20.0,
            "max": 25.0,
            "sum": 45.0,
            "count": 2
        });
        let ops = update_stats_ops(&reading, Some(&prior));

        let ops_json: Vec<Value> = ops.iter().map(|op| serde_json::to_value(op).unwrap()).collect();

        let merge_value = &ops_json[1]["value"];
        // min stays 20.0 (prior min < 30.0)
        assert_eq!(merge_value["min"], 20.0);
        // max becomes 30.0 (30.0 > prior max 25.0)
        assert_eq!(merge_value["max"], 30.0);
        // sum becomes 75.0 (45.0 + 30.0)
        assert_eq!(merge_value["sum"], 75.0);
        assert_eq!(merge_value["last_value"], 30.0);
    }

    #[tokio::test]
    async fn handle_stats_with_sensor_id_returns_ok() {
        let input = json!({ "sensor_id": "temp-001" });
        let result = handle_stats(input).await;
        assert!(result.is_ok());
        let val = result.unwrap();
        assert_eq!(val["status"], "ok");
        assert_eq!(val["sensor_id"], "temp-001");
    }

    #[tokio::test]
    async fn handle_stats_without_sensor_id_returns_unknown() {
        let input = json!({});
        let result = handle_stats(input).await;
        assert!(result.is_ok());
        let val = result.unwrap();
        assert_eq!(val["sensor_id"], "unknown");
    }
}
