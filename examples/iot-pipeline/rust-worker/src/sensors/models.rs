use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SensorType {
    Temperature,
    Humidity,
    Pressure,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Location {
    pub lat: f64,
    pub lon: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SensorReading {
    pub sensor_id: String,
    pub value: f64,
    pub timestamp: String,
    pub unit: String,
    pub sensor_type: SensorType,
    pub location: Location,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn valid_json_deserializes_into_sensor_reading() {
        let input = json!({
            "sensor_id": "temp-001",
            "value": 22.5,
            "timestamp": "2026-03-11T10:00:00Z",
            "unit": "celsius",
            "sensor_type": "temperature",
            "location": { "lat": 40.7128, "lon": -74.0060 }
        });

        let reading: SensorReading = serde_json::from_value(input).unwrap();
        assert_eq!(reading.sensor_id, "temp-001");
        assert_eq!(reading.value, 22.5);
        assert_eq!(reading.unit, "celsius");
        assert_eq!(reading.sensor_type, SensorType::Temperature);
        assert_eq!(reading.location.lat, 40.7128);
        assert_eq!(reading.location.lon, -74.0060);
    }

    #[test]
    fn extra_field_caller_worker_id_deserializes_via_flatten() {
        let input = json!({
            "sensor_id": "temp-001",
            "value": 22.5,
            "timestamp": "2026-03-11T10:00:00Z",
            "unit": "celsius",
            "sensor_type": "temperature",
            "location": { "lat": 40.7128, "lon": -74.0060 },
            "_caller_worker_id": "rust-worker-01"
        });

        let reading: SensorReading = serde_json::from_value(input).unwrap();
        assert_eq!(
            reading.extra.get("_caller_worker_id"),
            Some(&Value::String("rust-worker-01".to_string()))
        );
    }

    #[test]
    fn serde_round_trip_preserves_data() {
        let input = json!({
            "sensor_id": "humidity-001",
            "value": 65.0,
            "timestamp": "2026-03-11T12:00:00Z",
            "unit": "percent",
            "sensor_type": "humidity",
            "location": { "lat": 51.5074, "lon": -0.1278 }
        });

        let reading: SensorReading = serde_json::from_value(input).unwrap();
        let serialized = serde_json::to_value(&reading).unwrap();
        let roundtrip: SensorReading = serde_json::from_value(serialized).unwrap();
        assert_eq!(roundtrip.sensor_id, reading.sensor_id);
        assert_eq!(roundtrip.value, reading.value);
    }
}
