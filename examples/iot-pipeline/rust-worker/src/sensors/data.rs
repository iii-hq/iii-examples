use iii_sdk::{IIIError, Logger, Streams, UpdateOp};
use serde_json::{json, Value};

use super::aggregate;
use super::models::{SensorReading, ValidationError};

/// Validates a raw JSON input against the SensorReading schema.
/// Returns a list of validation errors (empty if valid).
pub fn validate_reading(input: &Value) -> Vec<ValidationError> {
    let mut errors = Vec::new();

    // sensor_id: required, non-empty string
    match input.get("sensor_id") {
        Some(Value::String(s)) if !s.is_empty() => {}
        Some(Value::String(_)) => {
            errors.push(ValidationError {
                field: "sensor_id".to_string(),
                message: "must be a non-empty string".to_string(),
            });
        }
        _ => {
            errors.push(ValidationError {
                field: "sensor_id".to_string(),
                message: "required".to_string(),
            });
        }
    }

    // value: required, finite f64
    match input.get("value") {
        Some(Value::Number(n)) => {
            if let Some(f) = n.as_f64() {
                if !f.is_finite() {
                    errors.push(ValidationError {
                        field: "value".to_string(),
                        message: "must be a finite number".to_string(),
                    });
                }
            } else {
                errors.push(ValidationError {
                    field: "value".to_string(),
                    message: "must be a finite number".to_string(),
                });
            }
        }
        _ => {
            errors.push(ValidationError {
                field: "value".to_string(),
                message: "required".to_string(),
            });
        }
    }

    // timestamp: required, must parse as RFC 3339
    match input.get("timestamp") {
        Some(Value::String(s)) => {
            if chrono::DateTime::parse_from_rfc3339(s).is_err() {
                errors.push(ValidationError {
                    field: "timestamp".to_string(),
                    message: "must be a valid RFC 3339 timestamp".to_string(),
                });
            }
        }
        _ => {
            errors.push(ValidationError {
                field: "timestamp".to_string(),
                message: "required".to_string(),
            });
        }
    }

    // unit: required, non-empty string
    match input.get("unit") {
        Some(Value::String(s)) if !s.is_empty() => {}
        Some(Value::String(_)) => {
            errors.push(ValidationError {
                field: "unit".to_string(),
                message: "must be a non-empty string".to_string(),
            });
        }
        _ => {
            errors.push(ValidationError {
                field: "unit".to_string(),
                message: "required".to_string(),
            });
        }
    }

    // sensor_type: required, one of temperature/humidity/pressure
    match input.get("sensor_type") {
        Some(Value::String(s)) => {
            if !["temperature", "humidity", "pressure"].contains(&s.as_str()) {
                errors.push(ValidationError {
                    field: "sensor_type".to_string(),
                    message: "must be one of: temperature, humidity, pressure".to_string(),
                });
            }
        }
        _ => {
            errors.push(ValidationError {
                field: "sensor_type".to_string(),
                message: "required".to_string(),
            });
        }
    }

    // location: required, must have numeric lat and lon
    match input.get("location") {
        Some(Value::Object(loc)) => {
            let has_lat = loc
                .get("lat")
                .and_then(|v| v.as_f64())
                .map(|f| f.is_finite())
                .unwrap_or(false);
            let has_lon = loc
                .get("lon")
                .and_then(|v| v.as_f64())
                .map(|f| f.is_finite())
                .unwrap_or(false);
            if !has_lat || !has_lon {
                errors.push(ValidationError {
                    field: "location".to_string(),
                    message: "must have numeric lat and lon".to_string(),
                });
            }
        }
        _ => {
            errors.push(ValidationError {
                field: "location".to_string(),
                message: "required".to_string(),
            });
        }
    }

    errors
}

/// Handler for `sensors::data::validate` -- validates input and returns errors.
pub async fn handle_validate(input: Value) -> Result<Value, IIIError> {
    let logger = Logger::new(Some("sensors::data::validate".to_string()));
    logger.info("Validating sensor data", None);

    let errors = validate_reading(&input);
    let valid = errors.is_empty();

    logger.info("Validation complete", Some(json!({"valid": valid})));
    Ok(json!({
        "errors": errors,
        "valid": valid
    }))
}

/// Ingest a sensor reading with stream writes and aggregation.
///
/// 1. Validates the raw JSON input
/// 2. Deserializes into SensorReading
/// 3. Writes reading to `readings::{sensor_id}::latest` via streams.merge
/// 4. Updates aggregated stats via `aggregate::update_stats`
/// 5. Returns the reading as JSON
pub async fn ingest_with_streams(input: Value, streams: &Streams) -> Result<Value, IIIError> {
    let logger = Logger::new(Some("sensors::data::ingest".to_string()));

    let errors = validate_reading(&input);
    if !errors.is_empty() {
        logger.warn("Validation failed", Some(json!({"errors": &errors})));
        return Ok(json!({ "errors": errors }));
    }

    let reading: SensorReading = serde_json::from_value(input).map_err(|e| {
        IIIError::Runtime(format!("deserialization failed: {e}"))
    })?;

    logger.info("Processing sensor ingest", Some(json!({"sensor_id": &reading.sensor_id})));

    // Write the full reading to the readings stream (full replace, not merge)
    let reading_value = serde_json::to_value(&reading).map_err(|e| {
        IIIError::Runtime(format!("serialization failed: {e}"))
    })?;
    streams
        .update(
            format!("readings::{}::latest", reading.sensor_id),
            vec![UpdateOp::set("", reading_value.clone())],
        )
        .await?;

    // Update aggregated stats atomically
    aggregate::update_stats(streams, &reading).await?;

    logger.info("Ingest complete, written to stream", Some(json!({"sensor_id": &reading.sensor_id})));

    Ok(json!({
        "status": "ingested",
        "reading": reading_value
    }))
}

/// Fallback handler for `sensors::data::ingest` when streams are not available.
/// In normal operation, main.rs registers a closure that calls `ingest_with_streams` instead.
pub async fn handle_ingest(input: Value) -> Result<Value, IIIError> {
    let logger = Logger::new(Some("sensors::data::ingest".to_string()));

    let errors = validate_reading(&input);
    if !errors.is_empty() {
        logger.warn("Validation failed", Some(json!({"errors": &errors})));
        return Ok(json!({ "errors": errors }));
    }

    let reading: SensorReading = serde_json::from_value(input).map_err(|e| {
        IIIError::Runtime(format!("deserialization failed: {e}"))
    })?;

    logger.info("Processing sensor ingest (no streams)", Some(json!({"sensor_id": &reading.sensor_id})));

    let output = serde_json::to_value(&reading).map_err(|e| {
        IIIError::Runtime(format!("serialization failed: {e}"))
    })?;

    logger.info("Ingest complete", Some(json!({"sensor_id": &reading.sensor_id})));

    Ok(json!({
        "status": "ingested",
        "reading": output
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn valid_payload() -> Value {
        json!({
            "sensor_id": "temp-001",
            "value": 22.5,
            "timestamp": "2026-03-11T10:00:00Z",
            "unit": "celsius",
            "sensor_type": "temperature",
            "location": { "lat": 40.7128, "lon": -74.0060 }
        })
    }

    #[test]
    fn validate_valid_payload_returns_no_errors() {
        let errors = validate_reading(&valid_payload());
        assert!(errors.is_empty(), "expected no errors, got: {errors:?}");
    }

    #[test]
    fn validate_missing_sensor_id_returns_error() {
        let mut payload = valid_payload();
        payload.as_object_mut().unwrap().remove("sensor_id");
        let errors = validate_reading(&payload);
        assert!(errors.iter().any(|e| e.field == "sensor_id"));
    }

    #[test]
    fn validate_nan_value_returns_error() {
        // serde_json cannot represent NaN directly, so we test with a non-number
        let mut payload = valid_payload();
        payload["value"] = json!("not_a_number");
        let errors = validate_reading(&payload);
        assert!(errors.iter().any(|e| e.field == "value"));
    }

    #[test]
    fn validate_invalid_timestamp_returns_error() {
        let mut payload = valid_payload();
        payload["timestamp"] = json!("not-a-timestamp");
        let errors = validate_reading(&payload);
        assert!(errors.iter().any(|e| e.field == "timestamp"));
    }

    #[test]
    fn validate_missing_location_returns_error() {
        let mut payload = valid_payload();
        payload.as_object_mut().unwrap().remove("location");
        let errors = validate_reading(&payload);
        assert!(errors.iter().any(|e| e.field == "location"));
    }

    #[test]
    fn validate_invalid_sensor_type_returns_error() {
        let mut payload = valid_payload();
        payload["sensor_type"] = json!("gamma_radiation");
        let errors = validate_reading(&payload);
        assert!(errors.iter().any(|e| e.field == "sensor_type"));
    }

    #[tokio::test]
    async fn handle_ingest_valid_payload_returns_ok_with_sensor_id() {
        let result = handle_ingest(valid_payload()).await.unwrap();
        assert_eq!(result["status"], "ingested");
        assert_eq!(result["reading"]["sensor_id"], "temp-001");
    }

    #[tokio::test]
    async fn handle_validate_invalid_payload_returns_ok_with_errors() {
        let result = handle_validate(json!({})).await.unwrap();
        assert_eq!(result["valid"], false);
        let errors = result["errors"].as_array().unwrap();
        assert!(!errors.is_empty());
    }

    #[tokio::test]
    async fn handle_validate_valid_payload_returns_valid_true() {
        let result = handle_validate(valid_payload()).await.unwrap();
        assert_eq!(result["valid"], true);
        let errors = result["errors"].as_array().unwrap();
        assert!(errors.is_empty());
    }

    #[tokio::test]
    async fn handle_ingest_invalid_payload_returns_errors_not_err() {
        let result = handle_ingest(json!({})).await;
        assert!(result.is_ok(), "handle_ingest should return Ok even for invalid input");
        let val = result.unwrap();
        assert!(val.get("errors").is_some());
    }
}
