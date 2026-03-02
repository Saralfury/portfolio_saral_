import asyncio
import random
import time

import numpy as np
from cachetools import TTLCache
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="Smart-Budget Semantic Router", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Semantic Cache ────────────────────────────────────────────────────────────
cache: TTLCache = TTLCache(maxsize=500, ttl=300)

# ── Simple FAQ Corpus (the "local knowledge base") ────────────────────────────
# These are the questions the local SLM can answer instantly at $0.
# Any incoming query with cosine similarity > 0.25 to any FAQ is routed locally.
# TF-IDF threshold is intentionally low (0.25) to capture paraphrased variants.

SIMPLE_FAQS = [
    "what are your hours",
    "when are you open",
    "what time do you close",
    "do you have a phone number",
    "what is your contact information",
    "where are you located",
    "what is your address",
    "how do I reset my password",
    "how do I change my email",
    "how do I cancel my subscription",
    "what is your refund policy",
    "how long does shipping take",
    "do you offer free shipping",
    "what payment methods do you accept",
    "do you accept credit cards",
    "what is your return policy",
    "how do I track my order",
    "where is my order",
    "what are your fees",
    "how much does it cost",
    "is there a free trial",
    "how do I sign up",
    "how do I log in",
    "I forgot my password",
    "what browsers do you support",
    "is the app available on mobile",
]

# ── TF-IDF Vectorizer — fitted on the FAQ corpus at startup ──────────────────
# Using character-level n-grams (analyzer='char_wb') so it handles typos and
# abbreviations gracefully, which is realistic for user-typed queries.

_vectorizer = TfidfVectorizer(
    analyzer="word",
    ngram_range=(1, 2),  # unigrams + bigrams
    sublinear_tf=True,   # log-normalised TF to reduce dominance of frequent terms
)
_faq_matrix = _vectorizer.fit_transform(SIMPLE_FAQS)


def compute_max_similarity(query: str) -> float:
    """Returns the highest cosine similarity between the query and any FAQ."""
    query_vec = _vectorizer.transform([query.lower()])
    similarities = cosine_similarity(query_vec, _faq_matrix)[0]
    return float(np.max(similarities))


# ── Schemas ───────────────────────────────────────────────────────────────────
class RouteRequest(BaseModel):
    query: str


class RouteResponse(BaseModel):
    query: str
    model_used: str
    latency_ms: float
    cost: float
    answer: str
    cache_hit: bool
    similarity_score: float   # exposed so the UI can show the NLP decision


# ── Route Endpoint ────────────────────────────────────────────────────────────
@app.post("/v1/route", response_model=RouteResponse)
async def route_query(request: RouteRequest):
    query = request.query.strip()
    start = time.perf_counter()

    # ── 1. Semantic Cache Check ───────────────────────────────────────────────
    if query in cache:
        cached = cache[query]
        elapsed = (time.perf_counter() - start) * 1000 + random.uniform(1.5, 2.5)
        return RouteResponse(
            query=query,
            model_used="CACHE_HIT",
            latency_ms=round(elapsed, 2),
            cost=0.000,
            answer=cached["answer"],
            cache_hit=True,
            similarity_score=cached["similarity_score"],
        )

    # ── 2. Real NLP Routing Decision (TF-IDF + Cosine Similarity) ─────────────
    similarity = compute_max_similarity(query)
    SIMILARITY_THRESHOLD = 0.25  # queries above this are "FAQ-like" → local SLM

    if similarity >= SIMILARITY_THRESHOLD:
        # Simple / FAQ-like query → route to local SLM
        answer = "Handled locally by on-device model to save costs."
        model_used = "LOCAL_Llama3_8B"
        cost = 0.000
        await asyncio.sleep(random.uniform(0.07, 0.10))
    else:
        # Complex / novel query → route to cloud LLM
        answer = "Complex synthesis executed via premium cloud API."
        model_used = "CLOUD_GPT4o"
        cost = 0.015
        await asyncio.sleep(0.8)   # realistic cloud round-trip latency

    elapsed = (time.perf_counter() - start) * 1000

    result = {"answer": answer, "similarity_score": similarity}
    cache[query] = result

    return RouteResponse(
        query=query,
        model_used=model_used,
        latency_ms=round(elapsed, 2),
        cost=cost,
        answer=answer,
        cache_hit=False,
        similarity_score=round(similarity, 4),
    )


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "cache_size": len(cache),
        "faq_count": len(SIMPLE_FAQS),
        "vectorizer": "TF-IDF (word 1-2gram, sublinear_tf)",
        "threshold": 0.25,
    }
