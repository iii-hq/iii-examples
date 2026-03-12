mod sensors;

use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use iii_sdk::{FunctionInfo, Logger, Streams, III, OtelConfig};
use serde_json::{json, Value};

const EXPECTED_PEERS: &[&str] = &[
    "analytics::stats::compute",
    "analytics::anomaly::detect",
    "analytics::batch::process",
    "api::http::post::sensors",
    "api::http::get::sensors_id",
    "api::http::get::analytics_summary",
    "api::http::get::system_workers",
    "api::http::get::system_functions",
    "api::alerts::notify",
];

#[tokio::main]
async fn main() {
    let ws_url =
        std::env::var("REMOTE_III_URL").unwrap_or_else(|_| "ws://127.0.0.1:49134".to_string());

    let iii = III::new(&ws_url);

    // --- OTel configuration (before connect) ---
    iii.set_otel_config(OtelConfig {
        service_name: Some("iot-rust-sensors".to_string()),
        service_version: Some("0.1.0".to_string()),
        metrics_enabled: Some(true),
        metrics_export_interval_ms: Some(10_000),
        ..OtelConfig::default()
    });

    // --- Create Streams instance (before connect -- Streams::new only clones the III ref) ---
    let streams = Arc::new(Streams::new(iii.clone()));

    // --- Register functions (before connect) ---
    let streams_ingest = Arc::clone(&streams);
    let _ingest = iii.register_function("sensors::data::ingest", move |input: Value| {
        let streams = Arc::clone(&streams_ingest);
        async move { sensors::data::ingest_with_streams(input, &streams).await }
    });
    let _validate = iii.register_function("sensors::data::validate", sensors::data::handle_validate);
    let _stats = iii.register_function("sensors::aggregate::stats", sensors::aggregate::handle_stats);

    // --- Register synthetic data generator (before connect) ---
    let last_values: Arc<tokio::sync::Mutex<HashMap<String, f64>>> =
        Arc::new(tokio::sync::Mutex::new(HashMap::new()));
    let streams_for_synth = Arc::clone(&streams);
    let last_values_clone = Arc::clone(&last_values);
    let iii_for_synth = iii.clone();
    let _generate =
        iii.register_function("sensors::synthetic::generate", move |input: Value| {
            let streams = Arc::clone(&streams_for_synth);
            let last_vals = Arc::clone(&last_values_clone);
            let iii_ref = iii_for_synth.clone();
            async move {
                let logger = Logger::new(Some("sensors::synthetic::generate".to_string()));
                logger.info("Generating synthetic sensor data", None);
                let result = sensors::synthetic::handle_generate(input, &streams, &last_vals, &iii_ref).await;
                logger.info("Synthetic data generation complete", None);
                result
            }
        });

    // --- Register batch streaming function (before connect) ---
    let iii_for_batch = iii.clone();
    let _batch = iii.register_function("sensors::batch::stream", move |input: Value| {
        let iii_ref = iii_for_batch.clone();
        async move {
            let logger = Logger::new(Some("sensors::batch::stream".to_string()));
            let readings: Vec<sensors::models::SensorReading> = serde_json::from_value(
                input.get("readings").cloned().unwrap_or(Value::Array(vec![]))
            ).map_err(|e| iii_sdk::IIIError::Handler(e.to_string()))?;
            logger.info("Batch stream started", Some(json!({"count": readings.len()})));
            let result = sensors::batch::handle_batch_stream(readings, &iii_ref).await;
            logger.info("Batch stream complete", None);
            result
        }
    });

    // --- Peer discovery (before connect) ---
    let discovered: Arc<Mutex<HashSet<String>>> = Arc::new(Mutex::new(HashSet::new()));
    let peers_ready = Arc::new(AtomicBool::new(false));

    let discovered_clone = Arc::clone(&discovered);
    let peers_ready_clone = Arc::clone(&peers_ready);
    let expected: HashSet<String> = EXPECTED_PEERS.iter().map(|s| s.to_string()).collect();
    let expected_count = expected.len();

    let _guard = iii.on_functions_available(move |functions: Vec<FunctionInfo>| {
        let mut set = discovered_clone.lock().unwrap_or_else(|e| e.into_inner());
        for func in &functions {
            if expected.contains(&func.function_id) && set.insert(func.function_id.clone()) {
                eprintln!(
                    "[discovery] Found peer: {} ({}/{})",
                    func.function_id,
                    set.len(),
                    expected_count
                );
            }
        }
        if set.len() == expected_count && !peers_ready_clone.load(Ordering::Relaxed) {
            peers_ready_clone.store(true, Ordering::Relaxed);
            eprintln!("[discovery] All peers ready");
        }
    });

    // --- Connect ---
    if let Err(e) = iii.connect().await {
        eprintln!("[error] Failed to connect to engine: {e}");
        return;
    }
    eprintln!("[connected] Rust sensor worker connected to {ws_url}");

    // --- Register cron trigger for synthetic data generation (after connect) ---
    let cron_expr = std::env::var("SENSOR_CRON_INTERVAL")
        .unwrap_or_else(|_| "*/5 * * * * *".to_string());
    match iii.register_trigger(
        "cron",
        "sensors::synthetic::generate",
        json!({"expression": cron_expr}),
    ) {
        Ok(_trigger) => eprintln!("[cron] Registered synthetic data generation: {cron_expr}"),
        Err(e) => eprintln!("[cron] Failed to register trigger: {e}"),
    }

    // --- Wait for peers (30s timeout) ---
    let pr = Arc::clone(&peers_ready);
    tokio::time::timeout(Duration::from_secs(30), async move {
        loop {
            if pr.load(Ordering::Relaxed) {
                break;
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    })
    .await
    .unwrap_or_else(|_| {
        eprintln!("[discovery] Timeout waiting for peers after 30s");
    });

    // --- Keep alive ---
    loop {
        tokio::time::sleep(Duration::from_secs(60)).await;
    }
}

