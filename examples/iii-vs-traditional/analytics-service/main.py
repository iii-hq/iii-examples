import math
import statistics
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Analytics Service")

API_KEY = "analytics-key-123"

DATASETS = {
    "default": [120, 135, 128, 142, 155, 149, 160, 172, 168, 180, 175, 190],
    "sales": [45, 52, 48, 61, 58, 72, 68, 75, 82, 79, 88, 95],
    "traffic": [1200, 1350, 1100, 1450, 1600, 1380, 1520, 1700, 1650, 1800, 1750, 1900],
}


def verify_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


class TimeseriesRequest(BaseModel):
    dataset: str = "default"
    start: int = 0
    end: Optional[int] = None


class PredictRequest(BaseModel):
    dataset: str = "default"
    periods: int = 3


class AnomalyRequest(BaseModel):
    dataset: str = "default"
    threshold: float = 2.0


class SegmentRequest(BaseModel):
    dataset: str = "default"
    segments: int = 3


class CorrelateRequest(BaseModel):
    dataset_a: str = "default"
    dataset_b: str = "sales"


class ReportRequest(BaseModel):
    dataset: str = "default"
    metric: str = "revenue"
    periods: int = 3


def get_data(name: str) -> list[float]:
    if name not in DATASETS:
        raise HTTPException(status_code=404, detail=f"Dataset '{name}' not found")
    return [float(v) for v in DATASETS[name]]


def linear_regression(data: list[float]) -> tuple[float, float]:
    n = len(data)
    x_vals = list(range(n))
    x_mean = statistics.mean(x_vals)
    y_mean = statistics.mean(data)
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, data, strict=True))
    denominator = sum((x - x_mean) ** 2 for x in x_vals)
    slope = numerator / denominator if denominator != 0 else 0
    intercept = y_mean - slope * x_mean
    return slope, intercept


@app.get("/health")
async def health():
    return {"status": "healthy", "datasets": list(DATASETS.keys())}


@app.get("/metrics/summary")
async def summary(dataset: str = "default", x_api_key: str = Header(None)):
    verify_key(x_api_key)
    data = get_data(dataset)
    return {
        "dataset": dataset,
        "count": len(data),
        "mean": round(statistics.mean(data), 2),
        "median": round(statistics.median(data), 2),
        "stdev": round(statistics.stdev(data), 2) if len(data) > 1 else 0,
        "min": min(data),
        "max": max(data),
    }


@app.post("/metrics/timeseries")
async def timeseries(req: TimeseriesRequest, x_api_key: str = Header(None)):
    verify_key(x_api_key)
    data = get_data(req.dataset)
    end = req.end if req.end is not None else len(data)
    sliced = data[req.start:end]
    return {
        "dataset": req.dataset,
        "range": [req.start, end],
        "values": sliced,
        "count": len(sliced),
    }


@app.post("/predict")
async def predict(req: PredictRequest, x_api_key: str = Header(None)):
    verify_key(x_api_key)
    data = get_data(req.dataset)
    n = len(data)
    slope, intercept = linear_regression(data)
    predictions = [round(slope * (n + i) + intercept, 2) for i in range(req.periods)]
    return {
        "dataset": req.dataset,
        "model": "linear_regression",
        "slope": round(slope, 4),
        "intercept": round(intercept, 4),
        "predictions": predictions,
    }


@app.post("/anomalies/detect")
async def detect_anomalies(req: AnomalyRequest, x_api_key: str = Header(None)):
    verify_key(x_api_key)
    data = get_data(req.dataset)
    mean = statistics.mean(data)
    stdev = statistics.stdev(data) if len(data) > 1 else 0
    anomalies = []
    for i, val in enumerate(data):
        if stdev > 0:
            z = abs(val - mean) / stdev
            if z > req.threshold:
                anomalies.append({"index": i, "value": val, "z_score": round(z, 2)})
    return {
        "dataset": req.dataset,
        "threshold": req.threshold,
        "anomalies": anomalies,
        "total_points": len(data),
    }


@app.post("/segments")
async def segment(req: SegmentRequest, x_api_key: str = Header(None)):
    verify_key(x_api_key)
    data = get_data(req.dataset)
    sorted_data = sorted(data)
    chunk_size = max(1, len(sorted_data) // req.segments)
    groups = []
    for i in range(req.segments):
        start = i * chunk_size
        end = start + chunk_size if i < req.segments - 1 else len(sorted_data)
        chunk = sorted_data[start:end]
        if chunk:
            groups.append({
                "segment": i + 1,
                "range": [chunk[0], chunk[-1]],
                "count": len(chunk),
                "mean": round(statistics.mean(chunk), 2),
            })
    return {"dataset": req.dataset, "segments": groups}


@app.post("/correlate")
async def correlate(req: CorrelateRequest, x_api_key: str = Header(None)):
    verify_key(x_api_key)
    a = get_data(req.dataset_a)
    b = get_data(req.dataset_b)
    n = min(len(a), len(b))
    a, b = a[:n], b[:n]
    mean_a, mean_b = statistics.mean(a), statistics.mean(b)
    cov = sum((x - mean_a) * (y - mean_b) for x, y in zip(a, b, strict=True)) / n
    std_a = statistics.stdev(a) if len(a) > 1 else 0
    std_b = statistics.stdev(b) if len(b) > 1 else 0
    r = cov / (std_a * std_b) if std_a > 0 and std_b > 0 else 0
    return {
        "dataset_a": req.dataset_a,
        "dataset_b": req.dataset_b,
        "correlation": round(r, 4),
        "strength": "strong" if abs(r) > 0.7 else "moderate" if abs(r) > 0.4 else "weak",
        "points": n,
    }


@app.post("/report/generate")
async def generate_report(req: ReportRequest, x_api_key: str = Header(None)):
    verify_key(x_api_key)
    data = get_data(req.dataset)
    mean = statistics.mean(data)
    stdev = statistics.stdev(data) if len(data) > 1 else 0

    n = len(data)
    slope, intercept = linear_regression(data)
    predictions = [round(slope * (n + i) + intercept, 2) for i in range(req.periods)]

    anomalies = []
    for i, val in enumerate(data):
        if stdev > 0:
            z = abs(val - mean) / stdev
            if z > 2.0:
                anomalies.append({"index": i, "value": val, "z_score": round(z, 2)})

    return {
        "dataset": req.dataset,
        "metric": req.metric,
        "summary": {
            "count": n,
            "mean": round(mean, 2),
            "median": round(statistics.median(data), 2),
            "stdev": round(stdev, 2),
            "min": min(data),
            "max": max(data),
        },
        "predictions": predictions,
        "anomalies": anomalies,
        "trend": "up" if slope > 0 else "down" if slope < 0 else "flat",
    }
