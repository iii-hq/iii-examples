"""Per-sensor statistics computation with CPU offloading."""

from __future__ import annotations

import asyncio
import statistics
from typing import Any

from iii import Logger
from src.streams import TimeSeriesRingBuffer

logger = Logger(function_name="analytics::stats::compute")

# ---------------------------------------------------------------------------
# Sync computation (runs in thread pool)
# ---------------------------------------------------------------------------


def _compute_stats_sync(values: list[float]) -> dict[str, Any]:
    """Pure synchronous statistics calculation."""
    if not values:
        return {"min": 0, "max": 0, "avg": 0, "count": 0}

    return {
        "min": min(values),
        "max": max(values),
        "avg": statistics.mean(values),
        "count": len(values),
    }


# ---------------------------------------------------------------------------
# Async entry point
# ---------------------------------------------------------------------------


async def compute(data: dict[str, Any], ring_buffer: TimeSeriesRingBuffer) -> dict[str, Any]:
    """Compute aggregated statistics for a sensor from ring buffer history.

    If ``sensor_id`` is provided, returns stats for that sensor.
    Otherwise, returns a summary across all sensors in the ring buffer.

    Offloads the math to a thread via ``run_in_executor``.
    """
    sensor_id: str | None = data.get("sensor_id")

    if sensor_id:
        logger.info("Computing stats", {"sensor_id": sensor_id})
        values = ring_buffer.get_values(sensor_id)

        loop = asyncio.get_running_loop()
        result: dict[str, Any] = await loop.run_in_executor(None, _compute_stats_sync, values)

        logger.info("Stats computation complete", {"sensor_id": sensor_id})
        result["sensor_id"] = sensor_id
        return result

    # No sensor_id — return summary across all sensors
    from iii.stream import StreamListGroupsInput

    logger.info("Computing summary across all sensors", {})
    groups = await ring_buffer.list_groups(StreamListGroupsInput(stream_name="timeseries"))
    loop = asyncio.get_running_loop()

    sensors: list[dict[str, Any]] = []
    for gid in groups:
        values = ring_buffer.get_values(gid)
        sensor_stats = await loop.run_in_executor(None, _compute_stats_sync, values)
        sensor_stats["sensor_id"] = gid
        sensors.append(sensor_stats)

    return {"sensors": sensors, "total_sensors": len(sensors)}
