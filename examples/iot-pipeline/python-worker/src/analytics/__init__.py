"""Analytics package -- anomaly detection, statistics computation, and batch processing."""

from .anomaly import detect
from .batch import batch_process
from .stats import compute

__all__ = ["detect", "compute", "batch_process"]
