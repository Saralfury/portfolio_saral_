import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="AI Health Monitor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────
class CheckRequest(BaseModel):
    simulate_environment_change: bool


class CheckResponse(BaseModel):
    status: str
    current_accuracy: str
    message: str
    new_accuracy: str | None = None
    stages_passed: list[str] = []


# ── Endpoint ──────────────────────────────────────────────────────────────────
@app.post("/v1/system-check", response_model=CheckResponse)
async def system_check(request: CheckRequest):
    if not request.simulate_environment_change:
        return CheckResponse(
            status="HEALTHY",
            current_accuracy="88%",
            message="Environment stable. AI predictions are highly reliable.",
        )

    # Simulate the automated pipeline running stage by stage
    stages: list[str] = []

    await asyncio.sleep(0.8)
    stages.append("WARNING: AI accuracy dropping due to new environmental data.")

    await asyncio.sleep(0.8)
    stages.append("Attempting to train a replacement AI...")

    await asyncio.sleep(0.8)
    stages.append("Safety Check: Comparing Old AI (88%) vs New AI (82%).")

    return CheckResponse(
        status="UPDATE_REJECTED",
        current_accuracy="88%",
        new_accuracy="82%",
        message=(
            "CRITICAL: New AI failed safety check. "
            "Automatic update cancelled to prevent patient misdiagnosis."
        ),
        stages_passed=stages,
    )


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}
