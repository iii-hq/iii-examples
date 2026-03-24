use iii_sdk::{IIIError, III};
use serde_json::{json, Value};

use super::models::SensorReading;

/// Stream a batch of sensor readings to the Python analytics worker via a channel.
///
/// Creates a ChannelWriter, serializes all readings as a single JSON array,
/// writes the batch in one call, closes the writer, then invokes the Python
/// `analytics::batch::process` function with the reader reference so it can
/// consume the data.
pub async fn handle_batch_stream(readings: Vec<SensorReading>, iii: &III) -> Result<Value, IIIError> {
    let batch_size = readings.len();

    // 1. Create a channel pair (writer + reader)
    let channel = iii
        .create_channel(None)
        .await
        .map_err(|e| IIIError::Handler(e.to_string()))?;

    // 2. Serialize the entire batch as a JSON array
    let payload =
        serde_json::to_vec(&readings).map_err(|e| IIIError::Handler(e.to_string()))?;

    // 3. Write the full batch in a single call (bulk streaming, not per-reading)
    channel
        .writer
        .write(&payload)
        .await
        .map_err(|e| IIIError::Handler(e.to_string()))?;

    // 4. Close the writer BEFORE calling Python -- otherwise read_all() hangs forever
    channel
        .writer
        .close()
        .await
        .map_err(|e| IIIError::Handler(e.to_string()))?;

    eprintln!("[batch] Streamed {batch_size} readings via channel");

    // 5. Invoke Python batch processor with the reader reference
    let python_result = iii
        .call(
            "analytics::batch::process",
            json!({"reader": channel.reader_ref, "batch_size": batch_size}),
        )
        .await?;

    Ok(json!({
        "batch_sent": batch_size,
        "result": python_result
    }))
}
