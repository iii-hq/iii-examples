"""TimeSeriesRingBuffer -- in-memory IStream backed by per-group deques.

Each group_id gets an independent deque (bounded by *max_size*).  When a deque
reaches capacity the oldest item_id is evicted from both the deque and the
backing dict so memory stays bounded.
"""

from __future__ import annotations

import copy
from collections import deque
from typing import Any

from iii.stream import (
    IStream,
    StreamDeleteInput,
    StreamGetInput,
    StreamListGroupsInput,
    StreamListInput,
    StreamSetInput,
    StreamSetResult,
    StreamUpdateInput,
)


class TimeSeriesRingBuffer(IStream[dict[str, Any]]):
    """Fixed-size ring buffer implementing the full IStream protocol.

    Parameters
    ----------
    max_size:
        Maximum number of items retained *per group*.  Oldest items are
        automatically evicted when the limit is exceeded.
    """

    def __init__(self, max_size: int = 100) -> None:
        self._max_size = max_size
        # group_id -> {item_id -> data}
        self._groups: dict[str, dict[str, dict[str, Any]]] = {}
        # group_id -> deque of item_ids (insertion order, bounded)
        self._order: dict[str, deque[str]] = {}

    # ------------------------------------------------------------------
    # IStream methods
    # ------------------------------------------------------------------

    async def get(self, input: StreamGetInput) -> dict[str, Any] | None:
        group = self._groups.get(input.group_id)
        if group is None:
            return None
        return group.get(input.item_id)

    async def set(self, input: StreamSetInput) -> StreamSetResult[dict[str, Any]] | None:
        gid = input.group_id
        iid = input.item_id

        if gid not in self._groups:
            self._groups[gid] = {}
            self._order[gid] = deque(maxlen=self._max_size)

        group = self._groups[gid]
        order = self._order[gid]

        old_value = copy.deepcopy(group.get(iid))

        # Check if deque is at capacity *before* appending a new (non-existing) key.
        # If the item already exists we just update in-place without touching the deque.
        if iid not in group:
            if len(order) == self._max_size:
                # deque will auto-evict the leftmost entry on append
                evicted_id = order[0]
                group.pop(evicted_id, None)
            order.append(iid)

        group[iid] = copy.deepcopy(input.data) if isinstance(input.data, dict) else input.data

        return StreamSetResult(old_value=old_value, new_value=copy.deepcopy(group[iid]))

    async def delete(self, input: StreamDeleteInput) -> None:
        group = self._groups.get(input.group_id)
        if group is not None:
            group.pop(input.item_id, None)

    async def list(self, input: StreamListInput) -> list[dict[str, Any]]:
        gid = input.group_id
        if gid not in self._order:
            return []
        group = self._groups.get(gid, {})
        # Return items in insertion order, skipping deleted entries
        return [group[iid] for iid in self._order[gid] if iid in group]

    async def list_groups(self, input: StreamListGroupsInput) -> list[str]:
        return list(self._groups.keys())

    async def update(self, input: StreamUpdateInput) -> StreamSetResult[dict[str, Any]] | None:
        group = self._groups.get(input.group_id)
        if group is None or input.item_id not in group:
            return None

        item = group[input.item_id]
        old_value = copy.deepcopy(item)

        for op in input.ops:
            op_type = op.type
            if op_type == "set":
                item[op.path] = op.value
            elif op_type == "increment":
                item[op.path] = item.get(op.path, 0) + op.by
            elif op_type == "decrement":
                item[op.path] = item.get(op.path, 0) - op.by
            elif op_type == "remove":
                item.pop(op.path, None)
            elif op_type == "merge":
                existing = item.get(op.path)
                if isinstance(existing, dict) and isinstance(op.value, dict):
                    existing.update(op.value)
                else:
                    item[op.path] = op.value

        return StreamSetResult(old_value=old_value, new_value=copy.deepcopy(item))

    # ------------------------------------------------------------------
    # Convenience helpers (not part of IStream)
    # ------------------------------------------------------------------

    def list_ordered(self, group_id: str) -> list[dict[str, Any]]:
        """Return items in deque order (synchronous).

        Useful when called from ``run_in_executor`` after copying state.
        """
        if group_id not in self._order:
            return []
        group = self._groups.get(group_id, {})
        return [group[iid] for iid in self._order[group_id] if iid in group]

    def get_values(self, group_id: str) -> list[float]:
        """Return ``value`` field from each item in deque order.

        Designed for Z-score computation in analytics handlers.
        """
        return [item["value"] for item in self.list_ordered(group_id) if "value" in item]
