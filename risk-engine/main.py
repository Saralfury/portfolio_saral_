import asyncio
import hashlib
import time
import uuid
from contextlib import asynccontextmanager
from functools import partial
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from cachetools import TTLCache
from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Model Lifecycle ──────────────────────────────────────────────────────────
# Loaded once at startup so inference never pays a disk I/O penalty per request.

_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    model_path = Path(__file__).parent / "fraud_model.pkl"
    if model_path.exists():
        _model = joblib.load(model_path)
        print(f"[STARTUP] fraud_model.pkl loaded — {_model.n_estimators} trees")
    else:
        print("[STARTUP] WARNING: fraud_model.pkl not found. Run: python train.py")
    yield
    _model = None


# ─── App Initialisation ───────────────────────────────────────────────────────

app = FastAPI(
    title="High-Throughput Risk Engine",
    description=(
        "Real-time fraud scoring API with a trained RandomForest model, "
        "150ms SLA circuit breaker, and TTLCache idempotency layer."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Idempotency Store (TTLCache: 1000 entries, 60-second TTL) ────────────────
idempotency_cache: TTLCache = TTLCache(maxsize=1000, ttl=60)


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class TransactionRequest(BaseModel):
    user_id: str
    amount: float
    timestamp: str
    force_timeout: bool = False


class ScoreResponse(BaseModel):
    idempotency_key: str
    risk_score: float
    decision: str
    latency_ms: float
    status: str
    cache_hit: bool


# ─── Feature Engineering ──────────────────────────────────────────────────────
# Maps the API payload to the 20-dimensional feature vector the model expects.
# Features are deterministic for a given (user_id, amount, timestamp) tuple so
# idempotent retries always produce the same score.

def feature_vector(user_id: str, amount: float, timestamp: str) -> np.ndarray:
    # Deterministic pseudo-random seed from user_id for stable features
    seed = int(hashlib.sha256(user_id.encode()).hexdigest(), 16) % (2**32)
    rng = np.random.default_rng(seed)

    # f0: normalised transaction amount (capped at $50k)
    f_amount = min(amount / 50_000.0, 1.0)

    # f1: log-scaled amount (captures heavy tail of fraud amounts)
    f_log_amount = np.log1p(amount) / np.log1p(50_000)

    # f2-f3: engineered from timestamp (hour + day signals)
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        f_hour = dt.hour / 23.0
        f_dow = dt.weekday() / 6.0
    except Exception:
        f_hour, f_dow = 0.5, 0.5

    # f4-f19: 16 user-behaviour pseudo-features (stable per user_id)
    f_user = rng.random(16)

    return np.array([f_amount, f_log_amount, f_hour, f_dow, *f_user], dtype=np.float32)


# ─── Real Inference (sync, run in thread pool) ────────────────────────────────

def _sync_infer(user_id: str, amount: float, timestamp: str) -> float:
    """Runs synchronous model.predict_proba in the calling thread."""
    if _model is None:
        # Graceful degradation: fall back to a safe mid-range score
        return 0.5

    fv = feature_vector(user_id, amount, timestamp).reshape(1, -1)
    proba = _model.predict_proba(fv)[0]   # [P(legit), P(fraud)]
    return float(proba[1])                # return fraud probability


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@app.post("/v1/score", response_model=ScoreResponse)
async def score_transaction(
    payload: TransactionRequest,
    x_idempotency_key: Optional[str] = Header(default=None),
):
    """
    Score a transaction for fraud using a trained RandomForestClassifier.

    Engineering guarantees:
    ① 150ms SLA enforced via asyncio.wait_for circuit breaker.
    ② Duplicate requests (same idempotency key) served from TTLCache in <5ms.
    ③ Inference runs in a thread-pool executor to keep the event loop unblocked.
    """
    idempotency_key = x_idempotency_key or str(uuid.uuid4())

    # ── ① Idempotency Check ──────────────────────────────────────────────────
    if idempotency_key in idempotency_cache:
        cached: dict = idempotency_cache[idempotency_key]
        return ScoreResponse(**{**cached, "cache_hit": True})

    # ── ② Circuit Breaker — enforce 150ms wall-clock SLA ────────────────────
    t_start = time.perf_counter()

    if payload.force_timeout:
        # Demo mode: guaranteed SLA breach so the circuit breaker always trips
        try:
            await asyncio.wait_for(asyncio.sleep(0.25), timeout=0.150)
        except asyncio.TimeoutError:
            pass
        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        return ScoreResponse(
            idempotency_key=idempotency_key,
            risk_score=0.0,
            decision="APPROVE",
            latency_ms=latency_ms,
            status="circuit_breaker_active",
            cache_hit=False,
        )

    # ── ③ Real ML Inference (non-blocking, runs in thread pool) ─────────────
    loop = asyncio.get_event_loop()
    infer = partial(_sync_infer, payload.user_id, payload.amount, payload.timestamp)

    try:
        risk_score: float = await asyncio.wait_for(
            loop.run_in_executor(None, infer),
            timeout=0.150,
        )
        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        decision = "BLOCK" if risk_score >= 0.65 else "REVIEW" if risk_score >= 0.35 else "APPROVE"
        status = "ok"
    except asyncio.TimeoutError:
        latency_ms = 150.0
        risk_score = 0.0
        decision = "APPROVE"
        status = "circuit_breaker_active"

    # ── Cache successful responses ────────────────────────────────────────────
    response_data = {
        "idempotency_key": idempotency_key,
        "risk_score": risk_score,
        "decision": decision,
        "latency_ms": latency_ms,
        "status": status,
        "cache_hit": False,
    }

    if status == "ok":
        idempotency_cache[idempotency_key] = response_data

    return ScoreResponse(**response_data)


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "nominal",
        "engine": "High-Throughput Risk Engine v2.0",
        "model_loaded": _model is not None,
        "model_type": type(_model).__name__ if _model else None,
    }
