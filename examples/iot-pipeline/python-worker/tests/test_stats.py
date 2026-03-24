"""Tests for analytics.stats -- per-sensor statistics computation."""

from __future__ import annotations

import pytest

from iii.stream import StreamSetInput
from src.analytics.stats import compute
from src.streams import TimeSeriesRingBuffer


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _populate_buffer(
    ring_buffer: TimeSeriesRingBuffer,
    sensor_id: str,
    values: list[float],
) -> None:
    """Insert values into the ring buffer for a given sensor_id."""
    for i, v in enumerate(values):
        await ring_buffer.set(
            StreamSetInput(
                stream_name="timeseries",
                group_id=sensor_id,
                item_id=f"ts-{i}",
                data={"sensor_id": sensor_id, "value": v},
            )
        )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compute_stats_normal() -> None:
    """Multiple values -> correct min, max, avg, count."""
    rb = TimeSeriesRingBuffer(max_size=100)
    await _populate_buffer(rb, "temp-001", [10, 20, 30])

    result = await compute({"sensor_id": "temp-001"}, rb)

    assert result["min"] == 10
    assert result["max"] == 30
    assert result["avg"] == 20
    assert result["count"] == 3
    assert result["sensor_id"] == "temp-001"


@pytest.mark.asyncio
async def test_compute_stats_empty() -> None:
    """No values for sensor -> zeros."""
    rb = TimeSeriesRingBuffer(max_size=100)

    result = await compute({"sensor_id": "temp-001"}, rb)

    assert result["min"] == 0
    assert result["max"] == 0
    assert result["avg"] == 0
    assert result["count"] == 0


@pytest.mark.asyncio
async def test_compute_stats_single() -> None:
    """Single value -> all stats equal that value."""
    rb = TimeSeriesRingBuffer(max_size=100)
    await _populate_buffer(rb, "temp-001", [42])

    result = await compute({"sensor_id": "temp-001"}, rb)

    assert result["min"] == 42
    assert result["max"] == 42
    assert result["avg"] == 42
    assert result["count"] == 1
