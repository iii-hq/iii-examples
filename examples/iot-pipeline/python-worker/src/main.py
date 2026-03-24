"""IoT Analytics Worker — Python worker for the IoT pipeline example."""

import asyncio
import os

from iii import III, InitOptions, Logger, OtelConfig, init_otel
from src.analytics import anomaly, batch, stats
from src.streams import TimeSeriesRingBuffer

# ---------------------------------------------------------------------------
# 1. OTel init — MUST be called BEFORE III() instantiation / iii.connect()
# ---------------------------------------------------------------------------
init_otel(
    OtelConfig(
        enabled=True,
        service_name="iot-analytics-worker",
        service_version="0.1.0",
        metrics_enabled=True,
        metrics_export_interval_ms=10000,
    )
)

# ---------------------------------------------------------------------------
# 2. III instance creation
# ---------------------------------------------------------------------------
engine_ws_url = os.environ.get("III_BRIDGE_URL", "ws://localhost:49134")
iii = III(address=engine_ws_url, options=InitOptions(worker_name="iot-analytics-worker"))

# ---------------------------------------------------------------------------
# 3. Shared ring buffer — registered as custom IStream with the engine
# ---------------------------------------------------------------------------
ring_buffer = TimeSeriesRingBuffer(max_size=100)
iii.create_stream("timeseries", ring_buffer)

# ---------------------------------------------------------------------------
# 4. Function registrations (all use :: separator)
# ---------------------------------------------------------------------------

logger = Logger(function_name="analytics")


async def _detect_anomaly(data: dict) -> dict:
    logger.info("Routing to anomaly detector", {"sensor_id": data.get("sensor_id")})
    return await anomaly.detect(data, ring_buffer)


async def _compute_stats(data: dict) -> dict:
    logger.info("Routing to stats computer", {"sensor_id": data.get("sensor_id")})
    return await stats.compute(data, ring_buffer)


async def _batch_process(data: dict) -> dict:
    logger.info("Routing to batch processor", {})
    return await batch.batch_process(data, ring_buffer, iii)


iii.register_function("analytics::anomaly::detect", _detect_anomaly)
iii.register_function("analytics::stats::compute", _compute_stats)
iii.register_function("analytics::batch::process", _batch_process)

# ---------------------------------------------------------------------------
# 5. Peer discovery with accumulation
# ---------------------------------------------------------------------------
EXPECTED_PEERS: set[str] = {
    "sensors::data::ingest",
    "sensors::data::validate",
    "sensors::aggregate::stats",
    "api::http::post::sensors",
    "api::http::get::sensors_id",
    "api::http::get::analytics_summary",
    "api::http::get::system_workers",
    "api::http::get::system_functions",
    "api::alerts::notify",
    "sensors::batch::stream",
}

discovered_ids: set[str] = set()
peers_ready = False


def on_functions_available(functions: list) -> None:
    """Accumulate discovered peer function IDs and log new discoveries."""
    global peers_ready
    for fn in functions:
        if fn.function_id in EXPECTED_PEERS and fn.function_id not in discovered_ids:
            discovered_ids.add(fn.function_id)
            print(f"[discovery] Discovered peer function: {fn.function_id}")
    if not peers_ready and EXPECTED_PEERS and EXPECTED_PEERS.issubset(discovered_ids):
        peers_ready = True
        print(f"[discovery] All peers ready: {discovered_ids}")


iii.on_functions_available(on_functions_available)

# ---------------------------------------------------------------------------
# 6. Async main — connect, 30s peer-discovery timeout, keep-alive
# ---------------------------------------------------------------------------


async def _async_main() -> None:
    await iii.connect()

    async def poll_peers() -> None:
        while not peers_ready:
            await asyncio.sleep(0.5)

    try:
        await asyncio.wait_for(poll_peers(), timeout=30.0)
    except asyncio.TimeoutError:
        print(f"[discovery] Timeout: not all peers found after 30s. Got: {discovered_ids}")

    # Keep-alive loop
    while True:
        await asyncio.sleep(60)


def main() -> None:
    asyncio.run(_async_main())


if __name__ == "__main__":
    main()
