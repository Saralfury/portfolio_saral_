import TerminalHeader from "./components/TerminalHeader";
import ProjectMonolith from "./components/ProjectMonolith";
import RiskEngineTerminal from "./components/RiskEngineTerminal";
import RouterTerminal from "./components/RouterTerminal";
import AiHealthMonitor from "./components/AiHealthMonitor";

// ── Glass Box: Architecture snippet shown inside Project 1's accordion ────────
// Highlights the two core engineering constraints: Circuit Breaker + Idempotency.
const RISK_ENGINE_SOURCE = `# risk-engine/main.py — Core Engineering Constraints

# ── ① Idempotency Layer (TTLCache, 60s TTL) ──────────────────────────────────
idempotency_cache: TTLCache = TTLCache(maxsize=1000, ttl=60)

@app.post("/v1/score")
async def score_transaction(payload: TransactionRequest,
                            x_idempotency_key: str = Header(default=None)):

    idempotency_key = x_idempotency_key or str(uuid.uuid4())

    # Duplicate request? Serve from cache instantly (<5ms).
    if idempotency_key in idempotency_cache:
        cached = idempotency_cache[idempotency_key]
        return ScoreResponse(**{**cached, "cache_hit": True})

    # ── ② Circuit Breaker — 150ms wall-clock SLA ─────────────────────────────
    # Inference runs in a thread-pool executor so the async event loop
    # stays unblocked. If it exceeds 150ms, asyncio.wait_for raises
    # TimeoutError and we immediately return a safe APPROVE fallback.

    loop = asyncio.get_event_loop()
    infer = partial(_sync_infer, payload.user_id, payload.amount, payload.timestamp)

    try:
        risk_score = await asyncio.wait_for(
            loop.run_in_executor(None, infer),
            timeout=0.150,   # ← hard 150ms SLA
        )
        decision = ("BLOCK" if risk_score >= 0.65
                    else "REVIEW" if risk_score >= 0.35
                    else "APPROVE")
        status = "ok"

    except asyncio.TimeoutError:
        risk_score, decision, status = 0.0, "APPROVE", "circuit_breaker_active"

    # ── ③ Real ML Inference (RandomForestClassifier.predict_proba) ───────────
    def _sync_infer(user_id, amount, timestamp) -> float:
        fv = feature_vector(user_id, amount, timestamp).reshape(1, -1)
        proba = _model.predict_proba(fv)[0]   # [P(legit), P(fraud)]
        return float(proba[1])                # return fraud probability`;

// ── Semantic Router: TF-IDF routing snippet ───────────────────────────────────
const ROUTER_SOURCE = `# semantic-router/main.py — Real NLP Routing Decision

# TF-IDF Vectorizer fitted on 26 FAQ templates at startup
_vectorizer = TfidfVectorizer(analyzer="word", ngram_range=(1, 2), sublinear_tf=True)
_faq_matrix = _vectorizer.fit_transform(SIMPLE_FAQS)

def compute_max_similarity(query: str) -> float:
    """Returns cosine similarity between query and closest FAQ."""
    query_vec = _vectorizer.transform([query.lower()])
    similarities = cosine_similarity(query_vec, _faq_matrix)[0]
    return float(np.max(similarities))

@app.post("/v1/route")
async def route_query(request: RouteRequest):
    query = request.query.strip()

    # ── Semantic Cache (exact match, 5-min TTL) ───────────────────────────────
    if query in cache:
        return cached_response(query)   # ~2ms, $0.000

    # ── NLP Routing Decision ──────────────────────────────────────────────────
    similarity = compute_max_similarity(query)
    THRESHOLD = 0.25   # above → FAQ-like → local SLM ($0); below → cloud ($0.015)

    if similarity >= THRESHOLD:
        model_used, cost = "LOCAL_Llama3_8B", 0.000
        await asyncio.sleep(0.085)   # local inference latency
    else:
        model_used, cost = "CLOUD_GPT4o", 0.015
        await asyncio.sleep(0.800)   # cloud round-trip latency`;

// ── AI Health Monitor: Safety gate snippet ────────────────────────────────────
const MONITOR_SOURCE = `# ai-health-monitor/main.py — Automated 4-Stage Safety Pipeline

@app.post("/v1/system-check")
async def system_check(request: CheckRequest):

    if not request.simulate_environment_change:
        return {"status": "HEALTHY", "current_accuracy": "88%"}

    # ── Stage 1: Detect accuracy drop ────────────────────────────────────────
    await asyncio.sleep(0.8)
    stages.append("WARNING: AI accuracy dropping due to new environmental data.")

    # ── Stage 2: Train replacement model ─────────────────────────────────────
    await asyncio.sleep(0.8)
    stages.append("Attempting to train a replacement AI...")

    # ── Stage 3: Safety gate — compare old vs new model ──────────────────────
    await asyncio.sleep(0.8)
    stages.append("Safety Check: Comparing Old AI (88%) vs New AI (82%).")

    # ── Decision: New model is WORSE. Block the update. ───────────────────────
    # If new_accuracy < current_accuracy → UPDATE_REJECTED.
    # This prevents patient misdiagnosis from a silently degraded model.
    return {
        "status": "UPDATE_REJECTED",
        "current_accuracy": "88%",   # retained
        "new_accuracy": "82%",       # rejected
        "message": "CRITICAL: New AI failed safety check. Update cancelled."
    }`;

const projects = [
  {
    title: "Real-Time Fraud & Risk Engine",
    role: "INFRASTRUCTURE & RELIABILITY",
    stack: "FastAPI, RandomForest, scikit-learn, joblib, TTLCache",
    problem:
      "If a fraud-check takes too long, customers abandon their cart. If they double-click 'Pay', they get charged twice.",
    fix: "I built a scoring engine that guarantees an answer in <150ms using a trained RandomForest model. It includes an idempotency layer that automatically catches and blocks accidental double-charges.",
    sourceCode: RISK_ENGINE_SOURCE,
  },
  {
    title: "The 'Smart-Budget' AI Router",
    role: "GEN-AI & UNIT ECONOMICS",
    stack: "FastAPI, TF-IDF, Cosine Similarity, TTLCache, scikit-learn",
    problem:
      "Sending every basic user question to premium AI models like GPT-4 is like hiring a rocket scientist to do basic math. It burns company money.",
    fix: "I architected a TF-IDF routing system that measures query similarity against a FAQ corpus. Simple questions are answered locally for $0; only novel complex queries wake up the expensive cloud AI.",
    sourceCode: ROUTER_SOURCE,
  },
  {
    title: "Self-Healing Disease Predictor",
    role: "MLOPS & AUTOMATION",
    stack: "FastAPI, XGBoost, GitHub Actions, Evidently AI",
    problem:
      "Health-prediction AI is dangerous if it silently degrades when real-world data changes. False negatives pile up unnoticed.",
    fix: "I built an automated 'health monitor' for the AI itself. If the model's accuracy drops below 85%, the pipeline detects the drift and forces a retraining cycle.",
    sourceCode: MONITOR_SOURCE,
  },
];

export default function Home() {
  const [project1, project2, project3] = projects;

  return (
    <main className="bg-white text-black min-h-screen p-4 md:p-12 font-mono">
      <TerminalHeader />

      <section className="mt-12">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest border-b-4 border-black pb-3 mb-0">
          ## PRODUCTION_ECOSYSTEM_MANIFEST
        </h2>

        {/* ── Unified bordered panel ── */}
        <div className="border-l-4 border-r-4 border-black">

          {/* Project 1 + Risk Engine Terminal */}
          <div className="border-b-4 border-black">
            <ProjectMonolith {...project1}>
              <RiskEngineTerminal />
            </ProjectMonolith>
          </div>

          {/* Project 2 + Router Terminal */}
          <div className="border-b-4 border-black">
            <ProjectMonolith {...project2}>
              <RouterTerminal />
            </ProjectMonolith>
          </div>

          {/* Project 3 + AI Health Monitor */}
          <div className="border-b-4 border-black">
            <ProjectMonolith {...project3}>
              <AiHealthMonitor />
            </ProjectMonolith>
          </div>

        </div>
      </section>

      <footer className="border-t-4 border-black pt-6 mt-12 font-mono text-sm">
        <p className="text-xs uppercase tracking-widest text-black">
          © SARAL SAINI — ALL SYSTEMS NOMINAL — {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
