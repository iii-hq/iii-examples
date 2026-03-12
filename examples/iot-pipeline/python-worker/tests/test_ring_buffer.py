"""Unit tests for TimeSeriesRingBuffer IStream implementation."""

import copy

import pytest

from iii.stream import (
    StreamDeleteInput,
    StreamGetInput,
    StreamListGroupsInput,
    StreamListInput,
    StreamSetInput,
    StreamUpdateInput,
    UpdateIncrement,
    UpdateMerge,
    UpdateSet,
)
from src.streams.ring_buffer import TimeSeriesRingBuffer


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_buffer(max_size: int = 100) -> TimeSeriesRingBuffer:
    return TimeSeriesRingBuffer(max_size=max_size)


STREAM = "sensor-readings"


# ---------------------------------------------------------------------------
# get / set basics
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_set_and_get():
    buf = _make_buffer()
    await buf.set(StreamSetInput(stream_name=STREAM, group_id="temp-001", item_id="t1", data={"value": 22.5}))
    result = await buf.get(StreamGetInput(stream_name=STREAM, group_id="temp-001", item_id="t1"))
    assert result == {"value": 22.5}


@pytest.mark.asyncio
async def test_set_returns_old_value():
    buf = _make_buffer()
    r1 = await buf.set(StreamSetInput(stream_name=STREAM, group_id="temp-001", item_id="t1", data={"value": 10}))
    assert r1 is not None
    assert r1.old_value is None
    assert r1.new_value == {"value": 10}

    r2 = await buf.set(StreamSetInput(stream_name=STREAM, group_id="temp-001", item_id="t1", data={"value": 20}))
    assert r2 is not None
    assert r2.old_value == {"value": 10}
    assert r2.new_value == {"value": 20}


@pytest.mark.asyncio
async def test_get_nonexistent():
    buf = _make_buffer()
    result = await buf.get(StreamGetInput(stream_name=STREAM, group_id="unknown", item_id="x"))
    assert result is None


# ---------------------------------------------------------------------------
# delete
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete():
    buf = _make_buffer()
    await buf.set(StreamSetInput(stream_name=STREAM, group_id="temp-001", item_id="t1", data={"value": 1}))
    await buf.delete(StreamDeleteInput(stream_name=STREAM, group_id="temp-001", item_id="t1"))
    result = await buf.get(StreamGetInput(stream_name=STREAM, group_id="temp-001", item_id="t1"))
    assert result is None


# ---------------------------------------------------------------------------
# list / list_groups
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list():
    buf = _make_buffer()
    for i in range(3):
        await buf.set(StreamSetInput(stream_name=STREAM, group_id="g1", item_id=f"i{i}", data={"value": i}))
    items = await buf.list(StreamListInput(stream_name=STREAM, group_id="g1"))
    assert len(items) == 3
    assert items == [{"value": 0}, {"value": 1}, {"value": 2}]


@pytest.mark.asyncio
async def test_list_empty_group():
    buf = _make_buffer()
    items = await buf.list(StreamListInput(stream_name=STREAM, group_id="nonexistent"))
    assert items == []


@pytest.mark.asyncio
async def test_list_groups():
    buf = _make_buffer()
    for gid in ["sensor-a", "sensor-b", "sensor-c"]:
        await buf.set(StreamSetInput(stream_name=STREAM, group_id=gid, item_id="x", data={"v": 1}))
    groups = await buf.list_groups(StreamListGroupsInput(stream_name=STREAM))
    assert sorted(groups) == ["sensor-a", "sensor-b", "sensor-c"]


# ---------------------------------------------------------------------------
# eviction
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_eviction():
    buf = _make_buffer(max_size=3)
    for i in range(4):
        await buf.set(StreamSetInput(stream_name=STREAM, group_id="g1", item_id=f"i{i}", data={"value": i}))
    items = await buf.list(StreamListInput(stream_name=STREAM, group_id="g1"))
    assert len(items) == 3
    assert items == [{"value": 1}, {"value": 2}, {"value": 3}]
    # First item should be evicted from the dict
    evicted = await buf.get(StreamGetInput(stream_name=STREAM, group_id="g1", item_id="i0"))
    assert evicted is None


# ---------------------------------------------------------------------------
# update operations
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_set_op():
    buf = _make_buffer()
    await buf.set(StreamSetInput(stream_name=STREAM, group_id="g1", item_id="x", data={"value": 10}))
    result = await buf.update(StreamUpdateInput(
        stream_name=STREAM, group_id="g1", item_id="x",
        ops=[UpdateSet(path="value", value=20)],
    ))
    assert result is not None
    assert result.old_value == {"value": 10}
    assert result.new_value == {"value": 20}


@pytest.mark.asyncio
async def test_update_increment_op():
    buf = _make_buffer()
    await buf.set(StreamSetInput(stream_name=STREAM, group_id="g1", item_id="x", data={"count": 5}))
    result = await buf.update(StreamUpdateInput(
        stream_name=STREAM, group_id="g1", item_id="x",
        ops=[UpdateIncrement(path="count", by=3)],
    ))
    assert result is not None
    assert result.new_value == {"count": 8}


@pytest.mark.asyncio
async def test_update_merge_op():
    buf = _make_buffer()
    await buf.set(StreamSetInput(stream_name=STREAM, group_id="g1", item_id="x", data={"stats": {"min": 1}}))
    result = await buf.update(StreamUpdateInput(
        stream_name=STREAM, group_id="g1", item_id="x",
        ops=[UpdateMerge(path="stats", value={"max": 10})],
    ))
    assert result is not None
    assert result.new_value["stats"] == {"min": 1, "max": 10}


@pytest.mark.asyncio
async def test_update_nonexistent():
    buf = _make_buffer()
    result = await buf.update(StreamUpdateInput(
        stream_name=STREAM, group_id="g1", item_id="missing",
        ops=[UpdateSet(path="value", value=1)],
    ))
    assert result is None
