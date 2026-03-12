"""Tests for analytics.anomaly -- Z-score anomaly detection."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from iii.stream import StreamSetInput
from src.analytics.anomaly import detect
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
async def test_detect_anomaly_normal() -> None:
    """Normal reading within historical range -> not anomalous."""
    rb = TimeSeriesRingBuffer(max_size=100)
    await _populate_buffer(rb, "temp-001", [20, 21, 22, 23, 24])

    result = await detect(
        {"sensor_id": "temp-001", "value": 22.5, "timestamp": "t1"},
        rb,
    )

    assert result["is_anomaly"] is False
    assert abs(result["z_score"]) < 3.0
    assert result["sensor_id"] == "temp-001"
    assert result["sample_size"] == 5


@pytest.mark.asyncio
async def test_detect_anomaly_anomalous() -> None:
    """Extreme outlier -> anomalous with z_score > 3."""
    rb = TimeSeriesRingBuffer(max_size=100)
    await _populate_buffer(rb, "temp-001", [20, 21, 22, 23, 24])

    result = await detect(
        {"sensor_id": "temp-001", "value": 87.5, "timestamp": "t1"},
        rb,
    )

    assert result["is_anomaly"] is True
    assert result["z_score"] > 3.0


@pytest.mark.asyncio
async def test_detect_anomaly_insufficient_data() -> None:
    """Only 1 data point -> not enough for stdev, is_anomaly=False."""
    rb = TimeSeriesRingBuffer(max_size=100)
    await _populate_buffer(rb, "temp-001", [20])

    result = await detect(
        {"sensor_id": "temp-001", "value": 99.0, "timestamp": "t1"},
        rb,
    )

    assert result["is_anomaly"] is False
    assert result["z_score"] == 0.0
    assert result["sample_size"] == 1
    assert result["reason"] == "insufficient_data"


@pytest.mark.asyncio
async def test_detect_anomaly_zero_variance() -> None:
    """All identical values -> stdev=0, is_anomaly=False."""
    rb = TimeSeriesRingBuffer(max_size=100)
    await _populate_buffer(rb, "temp-001", [20, 20, 20])

    result = await detect(
        {"sensor_id": "temp-001", "value": 20.0, "timestamp": "t1"},
        rb,
    )

    assert result["is_anomaly"] is False
    assert result["z_score"] == 0.0
    assert result["reason"] == "zero_variance"


@pytest.mark.asyncio
async def test_detect_anomaly_stores_reading() -> None:
    """After detect, the new reading should be stored in the ring buffer."""
    rb = TimeSeriesRingBuffer(max_size=100)
    await _populate_buffer(rb, "temp-001", [20, 21, 22])

    await detect(
        {"sensor_id": "temp-001", "value": 23.0, "timestamp": "t-new"},
        rb,
    )

    values = rb.get_values("temp-001")
    assert 23.0 in values


@pytest.mark.asyncio
async def test_uses_executor() -> None:
    """Verify that run_in_executor is called for CPU offloading."""
    rb = TimeSeriesRingBuffer(max_size=100)
    await _populate_buffer(rb, "temp-001", [20, 21, 22, 23, 24])

    mock_loop = MagicMock()
    mock_loop.run_in_executor = AsyncMock(
        return_value={
            "z_score": 0.0,
            "is_anomaly": False,
            "mean": 22.0,
            "stdev": 1.58,
            "threshold": 3.0,
            "sample_size": 5,
            "reason": "normal",
        }
    )

    with patch("asyncio.get_running_loop", return_value=mock_loop):
        await detect(
            {"sensor_id": "temp-001", "value": 22.0, "timestamp": "t1"},
            rb,
        )

    mock_loop.run_in_executor.assert_called_once()
    call_args = mock_loop.run_in_executor.call_args
    assert call_args[0][0] is None  # executor=None -> default thread pool
