# SARAL SAINI | MLOps & Systems Engineering Portfolio

**ARCHITECTURE OVERVIEW**

*This repository prioritizes MLOps infrastructure over raw model complexity. The embedded machine learning models (RandomForest/TF-IDF) are intentionally lightweight. The focus of this system is to demonstrate production-readiness: sub-150ms inference SLAs, real-time circuit breakers, Redis-style idempotency caching, and automated drift-detection pipelines. This is a systems-engineering portfolio, designed for reliability and scale.*

---

## Projects

### 1. Real-Time Fraud & Risk Engine (`/risk-engine`)
- **Model:** `RandomForestClassifier` trained on 10,000-sample synthetic fraud dataset (5% imbalance)
- **Engineering:** `asyncio.wait_for` circuit breaker (150ms SLA), `TTLCache` idempotency layer, thread-pool inference to keep event loop unblocked
- **API:** `POST /v1/score` with `X-Idempotency-Key` header

### 2. Smart-Budget Semantic Router (`/semantic-router`)
- **Model:** `TF-IDF Vectorizer` (word 1–2gram, sublinear TF) + cosine similarity against a 26-item FAQ corpus
- **Engineering:** NLP routing decision at `similarity > 0.25` threshold — FAQ-like queries route to local SLM ($0), novel queries to cloud LLM ($0.015). `TTLCache` for exact-match semantic caching.
- **API:** `POST /v1/route`

### 3. Self-Healing Disease Predictor (`/ai-health-monitor`)
- **Concept:** Automated 4-stage safety pipeline — monitors accuracy, trains replacement, runs safety check, rejects if worse
- **Engineering:** Async pipeline with hard accuracy gate — if new model < current model, update is cancelled to prevent patient harm
- **API:** `POST /v1/system-check`

---

## Running Locally

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — Risk Engine (port 8000)
cd risk-engine
python train.py          # generate fraud_model.pkl (one-time)
python -m uvicorn main:app --port 8000 --reload

# Terminal 3 — Semantic Router (port 8001)
cd semantic-router
python -m uvicorn main:app --port 8001 --reload

# Terminal 4 — AI Health Monitor (port 8002)
cd ai-health-monitor
python -m uvicorn main:app --port 8002
```

## Stack
`Next.js 14` · `FastAPI` · `scikit-learn` · `joblib` · `cachetools` · `Tailwind CSS` · `TypeScript`

---

> Built to demonstrate that **reliability engineering beats model complexity** in production systems.
