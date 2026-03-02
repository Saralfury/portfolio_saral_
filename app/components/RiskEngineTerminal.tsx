"use client";

import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreResponse {
    idempotency_key: string;
    risk_score: number;
    decision: string;
    latency_ms: number;
    status: string;
    cache_hit: boolean;
}

type MetricState = "idle" | "loading" | "ok" | "cache" | "tripped" | "error";

interface Metrics {
    latencyDisplay: string;
    decision: string;
    idempotencyState: string;
    circuitBreaker: string;
    riskScore: string;
    state: MetricState;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

const IDLE_METRICS: Metrics = {
    latencyDisplay: "—",
    decision: "—",
    idempotencyState: "AWAITING_REQUEST",
    circuitBreaker: "STABLE",
    riskScore: "—",
    state: "idle",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricBlock({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent?: string;
}) {
    return (
        <div className={`border-2 border-black p-3 ${accent ?? "bg-white"}`}>
            <p className="font-mono text-xs font-black uppercase tracking-widest text-gray-500 mb-1">
                {label}
            </p>
            <p className="font-mono text-xl font-black uppercase leading-tight break-all">
                {value}
            </p>
        </div>
    );
}

function ControlButton({
    number,
    label,
    sublabel,
    onClick,
    disabled,
    accent,
}: {
    number: string;
    label: string;
    sublabel: string;
    onClick: () => void;
    disabled: boolean;
    accent?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full border-2 border-black p-4 text-left group transition-all duration-75
        shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        hover:-translate-y-0.5 hover:translate-x-0.5
        active:shadow-none active:translate-x-0 active:translate-y-0
        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
        disabled:translate-x-0 disabled:translate-y-0
        ${accent ?? "bg-white hover:bg-black hover:text-white"}`}
        >
            <div className="flex items-start gap-3">
                <span className="font-mono font-black text-2xl leading-none shrink-0">
                    [{number}]
                </span>
                <div>
                    <p className="font-mono font-black text-sm uppercase tracking-tight leading-snug">
                        {label}
                    </p>
                    <p className="font-mono text-xs mt-1 opacity-60 group-hover:opacity-80">
                        {sublabel}
                    </p>
                </div>
            </div>
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RiskEngineTerminal() {
    const [metrics, setMetrics] = useState<Metrics>(IDLE_METRICS);
    const [loading, setLoading] = useState(false);
    const [lastKey, setLastKey] = useState<string>("");
    const [requestCount, setRequestCount] = useState(0);

    // ── Core fetch logic ────────────────────────────────────────────────────────
    const fireRequest = useCallback(
        async (key: string, forceTimeout: boolean, mode: "new" | "retry" | "force") => {
            if (loading) return;
            setLoading(true);
            setMetrics((prev) => ({ ...prev, state: "loading", decision: "SCORING…", circuitBreaker: prev.circuitBreaker }));

            const t0 = performance.now();

            try {
                const API_BASE = process.env.NEXT_PUBLIC_RISK_ENGINE_URL ?? "http://localhost:8000";
                const res = await fetch(`${API_BASE}/v1/score`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Idempotency-Key": key,
                    },
                    body: JSON.stringify({
                        user_id: "usr_" + key.slice(0, 8),
                        amount: parseFloat((Math.random() * 9900 + 100).toFixed(2)),
                        timestamp: new Date().toISOString(),
                        force_timeout: forceTimeout,
                    }),
                });

                const roundTripMs = performance.now() - t0;

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data: ScoreResponse = await res.json();

                const isCacheHit = data.cache_hit;
                const isTripped = data.status === "circuit_breaker_active";
                const newState: MetricState = isTripped ? "tripped" : isCacheHit ? "cache" : "ok";

                setMetrics({
                    latencyDisplay: isCacheHit
                        ? `${roundTripMs.toFixed(0)}ms (CACHE)`
                        : `${roundTripMs.toFixed(0)}ms`,
                    decision: data.decision,
                    idempotencyState: isCacheHit
                        ? "CACHE_HIT_PREVENTED_DUPLICATE"
                        : "NEW_TRANSACTION",
                    circuitBreaker: isTripped
                        ? "TRIPPED — DEFAULT_FALLBACK"
                        : "STABLE",
                    riskScore: isTripped ? "— (FALLBACK)" : data.risk_score.toFixed(4),
                    state: newState,
                });

                setRequestCount((c) => c + 1);
            } catch (err: unknown) {
                const roundTripMs = performance.now() - t0;
                const msg = err instanceof Error ? err.message : String(err);
                setMetrics({
                    latencyDisplay: `${roundTripMs.toFixed(0)}ms`,
                    decision: "ERROR",
                    idempotencyState: "REQUEST_FAILED",
                    circuitBreaker: "UNKNOWN",
                    riskScore: "—",
                    state: "error",
                });
                console.error("Risk Engine error:", msg);
            } finally {
                setLoading(false);
            }
        },
        [loading]
    );

    // ── Button Handlers ─────────────────────────────────────────────────────────
    const handleStandard = () => {
        const key = generateUUID();
        setLastKey(key);
        fireRequest(key, false, "new");
    };

    const handleRetry = () => {
        if (!lastKey) return handleStandard();
        fireRequest(lastKey, false, "retry");
    };

    const handleForce = () => {
        const key = generateUUID();
        setLastKey(key);
        fireRequest(key, true, "force");
    };

    // ── Derived accent colors for metric blocks ─────────────────────────────────
    const accentDecision =
        metrics.decision === "BLOCK"
            ? "bg-red-100 border-red-500"
            : metrics.decision === "REVIEW"
                ? "bg-yellow-100 border-yellow-500"
                : metrics.decision === "APPROVE"
                    ? "bg-green-100 border-green-500"
                    : "bg-white";

    const accentIdempotency =
        metrics.state === "cache"
            ? "bg-green-100 border-green-500"
            : metrics.state === "ok"
                ? "bg-white"
                : "bg-white";

    const accentCB =
        metrics.state === "tripped"
            ? "bg-red-100 border-red-500"
            : metrics.state === "ok" || metrics.state === "cache"
                ? "bg-green-100 border-green-500"
                : "bg-white";

    const accentLatency =
        metrics.state === "cache"
            ? "bg-yellow-100 border-yellow-500"
            : metrics.state === "tripped"
                ? "bg-red-100 border-red-500"
                : "bg-white";

    return (
        <div className="w-full mt-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

            {/* ── Header Bar ── */}
            <div className="bg-black text-white px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <span className="font-mono text-sm font-black uppercase tracking-widest">
            // RECRUITER_TEST_BENCH — RISK_ENGINE v1.0
                    </span>
                    <span className="font-mono text-xs text-gray-400 ml-3">
                        PORT :8000 | SLA :150ms | TTL :60s
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-400">
                        REQUESTS: {requestCount}
                    </span>
                    <span
                        className={`font-mono text-xs font-black px-2 py-0.5 border ${loading
                            ? "border-yellow-400 text-yellow-400 animate-pulse"
                            : "border-green-400 text-green-400"
                            }`}
                    >
                        {loading ? "● SCORING" : "● READY"}
                    </span>
                </div>
            </div>

            {/* ── 2-Column Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y-4 md:divide-y-0 md:divide-x-4 divide-black bg-white">

                {/* ── COLUMN 1: CONTROLS ── */}
                <div className="p-5">
                    <p className="font-mono text-xs font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
            // CONTROLS
                    </p>
                    <div className="flex flex-col gap-3">
                        <ControlButton
                            number="1"
                            label="SEND STANDARD REQUEST"
                            sublabel="Generates a new UUID · Expected SLA &lt; 150ms · Scores + caches result"
                            onClick={handleStandard}
                            disabled={loading}
                        />
                        <ControlButton
                            number="2"
                            label="SIMULATE NETWORK RETRY"
                            sublabel="Re-sends exact same UUID → proves idempotency layer fires · round-trip &lt; 20ms"
                            onClick={handleRetry}
                            disabled={loading || !lastKey}
                        />
                        <ControlButton
                            number="3"
                            label="FORCE SLA BREACH (&gt;150ms)"
                            sublabel="Sends force_timeout:true → inference sleeps 250ms → circuit breaker trips"
                            onClick={handleForce}
                            disabled={loading}
                            accent="bg-white hover:bg-red-700 hover:text-white border-red-600 text-red-700"
                        />
                    </div>

                    {/* Active Key Display */}
                    {lastKey && (
                        <div className="mt-4 border-2 border-black bg-black p-3">
                            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">
                                ACTIVE_IDEMPOTENCY_KEY
                            </p>
                            <p className="font-mono text-xs text-green-400 break-all">
                                {lastKey}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── COLUMN 2: SYSTEM METRICS ── */}
                <div className="p-5">
                    <p className="font-mono text-xs font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
            // SYSTEM_METRICS
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        {/* Latency */}
                        <MetricBlock
                            label="LATENCY"
                            value={metrics.latencyDisplay}
                            accent={accentLatency}
                        />

                        {/* Risk Score + Decision side by side */}
                        <div className="grid grid-cols-2 gap-3">
                            <MetricBlock
                                label="RISK_SCORE"
                                value={metrics.riskScore}
                            />
                            <MetricBlock
                                label="DECISION"
                                value={metrics.decision}
                                accent={metrics.decision !== "—" ? accentDecision : "bg-white"}
                            />
                        </div>

                        {/* Idempotency State */}
                        <MetricBlock
                            label="IDEMPOTENCY_STATE"
                            value={metrics.idempotencyState}
                            accent={accentIdempotency}
                        />

                        {/* Circuit Breaker */}
                        <MetricBlock
                            label="CIRCUIT_BREAKER"
                            value={metrics.circuitBreaker}
                            accent={accentCB}
                        />
                    </div>

                    {/* Legend */}
                    <div className="mt-4 border-t-2 border-black pt-3 grid grid-cols-3 gap-1">
                        {[
                            { color: "bg-green-100 border-green-500", label: "NOMINAL" },
                            { color: "bg-yellow-100 border-yellow-500", label: "CACHED" },
                            { color: "bg-red-100 border-red-500", label: "DEGRADED" },
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <div className={`w-3 h-3 border ${color} shrink-0`} />
                                <span className="font-mono text-xs text-gray-500 uppercase">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="bg-black px-4 py-2 border-t-4 border-black">
                <p className="font-mono text-xs text-gray-600">
                    CONSTRAINT MAP: [1] → PYDANTIC_CONTRACT + INFERENCE_PIPELINE | [2] → TTLCACHE_IDEMPOTENCY | [3] → ASYNCIO_CIRCUIT_BREAKER
                </p>
            </div>

        </div>
    );
}
