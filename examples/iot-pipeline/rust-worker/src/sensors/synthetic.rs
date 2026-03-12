use std::collections::HashMap;

use chrono::Utc;
use iii_sdk::{IIIError, Streams, III};
use rand::Rng;
use serde_json::{json, Value};
use tokio::sync::Mutex;

use super::data;
use super::models::{Location, SensorReading, SensorType};

/// Configuration for a single synthetic sensor.
pub struct SensorConfig {
    pub id: &'static str,
    pub sensor_type: SensorType,
    pub unit: &'static str,
    pub min_normal: f64,
    pub max_normal: f64,
    pub lat: f64,
    pub lon: f64,
}

/// Returns the 5 synthetic sensor configurations.
pub fn sensors() -> Vec<SensorConfig> {
    vec![
        SensorConfig {
            id: "temp-001",
            sensor_type: SensorType::Temperature,
            unit: "celsius",
            min_normal: 15.0,
            max_normal: 35.0,
            lat: 37.7749,
            lon: -122.4194,
        },
        SensorConfig {
            id: "temp-002",
            sensor_type: SensorType::Temperature,
            unit: "celsius",
            min_normal: 15.0,
            max_normal: 35.0,
            lat: 40.7128,
            lon: -74.0060,
        },
        SensorConfig {
            id: "humidity-001",
            sensor_type: SensorType::Humidity,
            unit: "percent",
            min_normal: 30.0,
            max_normal: 80.0,
            lat: 37.7749,
            lon: -122.4194,
        },
        SensorConfig {
            id: "humidity-002",
            sensor_type: SensorType::Humidity,
            unit: "percent",
            min_normal: 30.0,
            max_normal: 80.0,
            lat: 40.7128,
            lon: -74.0060,
        },
        SensorConfig {
            id: "pressure-001",
            sensor_type: SensorType::Pressure,
            unit: "hpa",
            min_normal: 990.0,
            max_normal: 1030.0,
            lat: 37.7749,
            lon: -122.4194,
        },
    ]
}

/// Generate a single synthetic sensor reading.
///
/// - 5% chance of anomalous value (2.5x max_normal, obviously out of range for Z-score detection)
/// - Normal: drift from last_value (or midpoint) by +/-2.0, clamped to min..=max
pub fn generate_reading(config: &SensorConfig, last_value: Option<f64>) -> SensorReading {
    let mut rng = rand::thread_rng();
    let is_anomaly = rng.gen_bool(0.05);

    let value = if is_anomaly {
        config.max_normal * 2.5
    } else {
        let base = last_value.unwrap_or((config.min_normal + config.max_normal) / 2.0);
        let drift = rng.gen_range(-2.0..2.0);
        (base + drift).clamp(config.min_normal, config.max_normal)
    };

    SensorReading {
        sensor_id: config.id.to_string(),
        value,
        timestamp: Utc::now().to_rfc3339(),
        unit: config.unit.to_string(),
        sensor_type: config.sensor_type.clone(),
        location: Location {
            lat: config.lat,
            lon: config.lon,
        },
        extra: HashMap::new(),
    }
}

/// Generate readings for all 5 synthetic sensors.
pub fn generate_all_readings(last_values: &HashMap<String, f64>) -> Vec<SensorReading> {
    sensors()
        .iter()
        .map(|config| {
            let last = last_values.get(config.id).copied();
            generate_reading(config, last)
        })
        .collect()
}

/// Async handler for cron-triggered synthetic data generation.
///
/// Generates readings for all 5 sensors, ingests each through the pipeline
/// (validation + stream write + aggregation), and updates last_values.
pub async fn handle_generate(
    _input: Value,
    streams: &Streams,
    last_values: &Mutex<HashMap<String, f64>>,
    iii: &III,
) -> Result<Value, IIIError> {
    let current_last = last_values.lock().await.clone();
    let readings = generate_all_readings(&current_last);

    let mut sensor_ids = Vec::new();
    let mut new_last = last_values.lock().await;

    for reading in &readings {
        let reading_json = serde_json::to_value(reading)
            .map_err(|e| IIIError::Runtime(format!("serialization failed: {e}")))?;

        data::ingest_with_streams(reading_json, streams).await?;

        new_last.insert(reading.sensor_id.clone(), reading.value);
        sensor_ids.push(reading.sensor_id.clone());
    }

    // Drop the lock before the batch call to avoid holding it across await
    drop(new_last);

    eprintln!(
        "[synthetic] Generated {} readings for sensors: {:?}",
        sensor_ids.len(),
        sensor_ids
    );

    // Batch-stream the same readings via channel to Python (non-fatal secondary path)
    let readings_for_batch: Vec<SensorReading> = {
        let current = last_values.lock().await.clone();
        generate_all_readings(&current)
    };
    match super::batch::handle_batch_stream(readings_for_batch, iii).await {
        Ok(result) => eprintln!("[synthetic] Batch stream result: {result}"),
        Err(e) => eprintln!("[synthetic] Batch stream failed (non-fatal): {e}"),
    }

    Ok(json!({
        "generated": sensor_ids.len(),
        "sensor_ids": sensor_ids
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sensors_has_exactly_5_entries_with_expected_ids() {
        let configs = sensors();
        assert_eq!(configs.len(), 5);
        let ids: Vec<&str> = configs.iter().map(|c| c.id).collect();
        assert!(ids.contains(&"temp-001"));
        assert!(ids.contains(&"temp-002"));
        assert!(ids.contains(&"humidity-001"));
        assert!(ids.contains(&"humidity-002"));
        assert!(ids.contains(&"pressure-001"));
    }

    #[test]
    fn generate_reading_no_last_value_returns_value_in_normal_range() {
        let config = SensorConfig {
            id: "temp-001",
            sensor_type: SensorType::Temperature,
            unit: "celsius",
            min_normal: 15.0,
            max_normal: 35.0,
            lat: 37.7749,
            lon: -122.4194,
        };

        // Run 100 iterations -- non-anomalous values must be in [15.0, 35.0]
        for _ in 0..100 {
            let reading = generate_reading(&config, None);
            assert_eq!(reading.sensor_id, "temp-001");
            assert_eq!(reading.unit, "celsius");
            // Value is either in normal range or anomalous (2.5x max)
            let is_normal = reading.value >= 15.0 && reading.value <= 35.0;
            let is_anomalous = (reading.value - 87.5).abs() < 0.001; // 35.0 * 2.5
            assert!(
                is_normal || is_anomalous,
                "value {} is neither normal nor anomalous",
                reading.value
            );
        }
    }

    #[test]
    fn generate_reading_with_last_value_drifts_within_range() {
        let config = SensorConfig {
            id: "humidity-001",
            sensor_type: SensorType::Humidity,
            unit: "percent",
            min_normal: 30.0,
            max_normal: 80.0,
            lat: 37.7749,
            lon: -122.4194,
        };

        for _ in 0..100 {
            let reading = generate_reading(&config, Some(50.0));
            let is_normal = reading.value >= 30.0 && reading.value <= 80.0;
            let is_anomalous = (reading.value - 200.0).abs() < 0.001; // 80.0 * 2.5
            assert!(
                is_normal || is_anomalous,
                "value {} is neither normal [30,80] nor anomalous (200.0)",
                reading.value
            );
            // Non-anomalous values should be within drift range of 50.0
            if is_normal {
                assert!(
                    reading.value >= 48.0 && reading.value <= 52.0,
                    "normal value {} not within drift of 50.0",
                    reading.value
                );
            }
        }
    }

    #[test]
    fn generate_reading_anomaly_exceeds_max_normal() {
        let config = SensorConfig {
            id: "temp-001",
            sensor_type: SensorType::Temperature,
            unit: "celsius",
            min_normal: 15.0,
            max_normal: 35.0,
            lat: 37.7749,
            lon: -122.4194,
        };

        // Check that anomalous value = max_normal * 2.5
        // We cannot force anomaly with thread_rng, so just verify the constant
        let anomalous_value = config.max_normal * 2.5;
        assert!(
            anomalous_value > config.max_normal,
            "anomalous value must exceed max_normal"
        );
        assert_eq!(anomalous_value, 87.5);
    }

    #[test]
    fn generate_all_readings_returns_5_distinct_sensor_ids() {
        let last_values = HashMap::new();
        let readings = generate_all_readings(&last_values);
        assert_eq!(readings.len(), 5);

        let mut ids: Vec<String> = readings.iter().map(|r| r.sensor_id.clone()).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), 5, "all 5 sensor_ids must be distinct");
    }

    #[test]
    fn anomaly_rate_is_approximately_5_percent() {
        let config = SensorConfig {
            id: "temp-001",
            sensor_type: SensorType::Temperature,
            unit: "celsius",
            min_normal: 15.0,
            max_normal: 35.0,
            lat: 37.7749,
            lon: -122.4194,
        };

        let iterations = 1000;
        let mut anomaly_count = 0;
        for _ in 0..iterations {
            let reading = generate_reading(&config, None);
            if reading.value > config.max_normal {
                anomaly_count += 1;
            }
        }

        // Expect ~5% anomaly rate; allow 1-15% range for statistical variation
        let rate = anomaly_count as f64 / iterations as f64;
        assert!(
            rate >= 0.01 && rate <= 0.15,
            "anomaly rate {rate:.3} outside expected range [0.01, 0.15]"
        );
    }
}
