"""Z-score anomaly detection with CPU offloading via run_in_executor."""

from __future__ import annotations

import asyncio
import statistics
import time
from typing import Any

from iii import Logger
from iii.stream import StreamSetInput
from src.streams import TimeSeriesRingBuffer

logger = Logger(function_name="analytics::anomaly::detect")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ANOMALY_THRESHOLD = 3.0

# ---------------------------------------------------------------------------
# Sync Z-score computation (runs in thread pool)
# ---------------------------------------------------------------------------


def _zscore_sync(value: float, history: list[float]) -> dict[str, Any]:
    """Pure synchronous Z-score calculation.

    Designed to run inside ``run_in_executor`` so it never blocks the
    event loop.
    """
    sample_size = len(history)

    if sample_size < 2:
        return {
            "z_score": 0.0,
            "is_anomaly": False,
            "mean": history[0] if history else 0.0,
            "stdev": 0.0,
            "threshold": ANOMALY_THRESHOLD,
            "sample_size": sample_size,
            "reason": "insufficient_data",
        }

    mean = statistics.mean(history)
    stdev = statistics.pstdev(history)

    if stdev == 0:
        return {
            "z_score": 0.0,
            "is_anomaly": False,
            "mean": mean,
            "stdev": 0.0,
            "threshold": ANOMALY_THRESHOLD,
            "sample_size": sample_size,
            "reason": "zero_variance",
        }

    z_score = (value - mean) / stdev
    is_anomaly = abs(z_score) > ANOMALY_THRESHOLD

    return {
        "z_score": z_score,
        "is_anomaly": is_anomaly,
        "mean": mean,
        "stdev": stdev,
        "threshold": ANOMALY_THRESHOLD,
        "sample_size": sample_size,
        "reason": "anomaly" if is_anomaly else "normal",
    }


# ---------------------------------------------------------------------------
# Async entry point
# ---------------------------------------------------------------------------


async def detect(data: dict[str, Any], ring_buffer: TimeSeriesRingBuffer) -> dict[str, Any]:
    """Detect anomalies in sensor readings using Z-score analysis.

    1. Reads historical values from the ring buffer (sync, fast list copy).
    2. Offloads Z-score math to a thread via ``run_in_executor``.
    3. Stores the incoming reading in the ring buffer.
    4. Returns the detection result with sensor_id attached.
    """
    sensor_id: str = data["sensor_id"]
    value: float = data["value"]

    logger.info("Anomaly detection started", {"sensor_id": sensor_id, "value": value})

    # Sync convenience -- just a list copy, no IO
    history = ring_buffer.get_values(sensor_id)

    # CPU offload
    loop = asyncio.get_running_loop()
    result: dict[str, Any] = await loop.run_in_executor(None, _zscore_sync, value, history)

    # Store the reading as a side effect
    timestamp = data.get("timestamp", str(time.time()))
    await ring_buffer.set(
        StreamSetInput(
            stream_name="timeseries",
            group_id=sensor_id,
            item_id=timestamp,
            data=data,
        )
    )

    if result.get("is_anomaly"):
        logger.warn("Anomaly detected", {"sensor_id": sensor_id, "z_score": result["z_score"]})

    logger.info("Anomaly detection complete", {"sensor_id": sensor_id, "is_anomaly": result["is_anomaly"]})

    result["sensor_id"] = sensor_id
    return result
