"""Batch processing of sensor readings received via ChannelReader."""

from __future__ import annotations

import json
from typing import Any

from iii import III
from iii.channels import ChannelReader
from src.analytics import anomaly
from src.streams import TimeSeriesRingBuffer


async def batch_process(
    input_data: dict[str, Any],
    ring_buffer: TimeSeriesRingBuffer,
    iii: III,
) -> dict[str, Any]:
    """Process a batch of sensor readings from a ChannelReader.

    1. Reads entire batch from the auto-resolved ChannelReader
    2. Deserializes JSON bytes into a list of reading dicts
    3. Runs anomaly detection on each reading
    4. Dispatches alert to api::alerts::notify for each anomaly
    5. Returns processing summary
    """
    reader: ChannelReader = input_data["reader"]  # auto-resolved by SDK

    # Read entire batch (blocks until writer closes)
    raw: bytes = await reader.read_all()
    readings: list[dict[str, Any]] = json.loads(raw.decode("utf-8"))

    results: list[dict[str, Any]] = []
    anomalies: list[dict[str, Any]] = []

    for reading in readings:
        # Reuse existing anomaly detection (uses run_in_executor internally)
        detection = await anomaly.detect(
            {"sensor_id": reading["sensor_id"], "value": reading["value"]},
            ring_buffer,
        )
        results.append(detection)

        if detection["is_anomaly"]:
            anomalies.append({
                "sensor_id": reading["sensor_id"],
                "reading": reading,
                "detection": detection,
            })

    # Dispatch alerts for all anomalies found in batch
    alert_results = []
    for anom in anomalies:
        try:
            alert_result = await iii.call("api::alerts::notify", {
                "sensor_id": anom["sensor_id"],
                "severity": "high",
                "message": f"Batch anomaly: z_score={anom['detection']['z_score']:.2f}",
                "reading": anom["reading"]["value"],
                "z_score": anom["detection"]["z_score"],
            })
            alert_results.append(alert_result)
        except Exception as e:
            print(f"[batch] Alert dispatch failed for {anom['sensor_id']}: {e}")
            alert_results.append({"status": "error", "error": str(e)})

    print(
        f"[batch] Processed {len(readings)} readings, "
        f"found {len(anomalies)} anomalies, "
        f"dispatched {len(alert_results)} alerts"
    )

    return {
        "processed": len(readings),
        "anomalies_found": len(anomalies),
        "alerts_dispatched": len(alert_results),
        "results": results,
    }
