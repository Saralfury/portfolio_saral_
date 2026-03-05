"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface RouteResult {
    query: string;
    model_used: string;
    latency_ms: number;
    cost: number;
    answer: string;
    cache_hit: boolean;
}

interface LogEntry extends RouteResult {
    id: number;
    savedAmount: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CLOUD_COST = 0.015;
const API_URL = `${process.env.NEXT_PUBLIC_ROUTER_URL ?? "http://localhost:8001"}/v1/route`;

const SIMPLE_QUERY = "What are your hours?";
const COMPLEX_QUERY =
    "Synthesize the Q3 financial reports, identify the top three cost drivers, and compare performance to Q2 targets.";

// ── Helpers ───────────────────────────────────────────────────────────────────
function modelColor(model: string): string {
    if (model === "CACHE_HIT") return "text-green-400";
    if (model.startsWith("LOCAL")) return "text-green-400";
    return "text-red-400";
}

function modelBg(model: string): string {
    if (model === "CACHE_HIT") return "bg-green-900 border-green-400 text-green-300";
    if (model.startsWith("LOCAL")) return "bg-green-900 border-green-400 text-green-300";
    return "bg-red-900 border-red-400 text-red-300";
}

function formatCost(cost: number): string {
    return cost === 0 ? "$0.000" : `$${cost.toFixed(3)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RouterTerminal() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [totalSavings, setTotalSavings] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [lastResult, setLastResult] = useState<LogEntry | null>(null);
    const [idCounter, setIdCounter] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    async function sendQuery(query: string) {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: RouteResult = await res.json();

            // Calculate session savings: every non-cloud call saves $0.015
            const saved = data.model_used !== "CLOUD_GPT4o" ? CLOUD_COST : 0;

            const entry: LogEntry = {
                ...data,
                id: idCounter,
                savedAmount: saved,
            };

            setIdCounter((c) => c + 1);
            setLogs((prev) => [entry, ...prev].slice(0, 10));
            setTotalSavings((prev) => prev + saved);
            setLastResult(entry);
        } catch {
            setError(
                "Connection refused. Start the backend: cd semantic-router && uvicorn main:app --port 8001"
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="border-t-4 border-black bg-black text-white font-mono">
            {/* ── Terminal Title Bar ──────────────────────────────────────── */}
            <div className="border-b-4 border-white px-8 py-4 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-white">
                    SMART BUDGET ROUTER :: UNIT ECONOMICS BENCH
                </span>
                <span className="text-xs text-gray-500 uppercase tracking-widest">
                    API → localhost:8001
                </span>
            </div>

            {/* ── Error Banner ────────────────────────────────────────────── */}
            {error && (
                <div className="border-b-4 border-yellow-400 bg-yellow-900 px-8 py-4">
                    <p className="text-yellow-300 text-xs font-black uppercase tracking-wider">
                        ⚠ {error}
                    </p>
                </div>
            )}

            {/* ── Main Grid ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

                {/* LEFT: Controls ─────────────────────────────────────────── */}
                <div className="border-b-4 md:border-b-0 md:border-r-4 border-white p-8 flex flex-col gap-6">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-gray-700 pb-4">
                        QUERY CONTROLS
                    </p>

                    {/* Button 1: Simple */}
                    <button
                        onClick={() => sendQuery(SIMPLE_QUERY)}
                        disabled={isLoading}
                        className="w-full border-4 border-green-400 text-green-400 p-6 text-left hover:bg-green-400 hover:text-black transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                        <span className="text-lg font-black uppercase block mb-2">
                            [ SEND SIMPLE QUERY ]
                        </span>
                        <span className="text-xs text-green-600 group-hover:text-black transition-colors">
                            &quot;{SIMPLE_QUERY}&quot;
                        </span>
                        <span className="block mt-3 text-xs font-black border border-green-700 group-hover:border-black px-2 py-1 w-fit uppercase tracking-wider">
                            Expected → LOCAL_Llama3_8B · $0.000
                        </span>
                    </button>

                    {/* Button 2: Complex */}
                    <button
                        onClick={() => sendQuery(COMPLEX_QUERY)}
                        disabled={isLoading}
                        className="w-full border-4 border-red-400 text-red-400 p-6 text-left hover:bg-red-400 hover:text-black transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                        <span className="text-lg font-black uppercase block mb-2">
                            [ SEND COMPLEX QUERY ]
                        </span>
                        <span className="text-xs text-red-600 group-hover:text-black transition-colors line-clamp-2">
                            &quot;Synthesize the Q3 financial reports...&quot;
                        </span>
                        <span className="block mt-3 text-xs font-black border border-red-700 group-hover:border-black px-2 py-1 w-fit uppercase tracking-wider">
                            Expected → CLOUD_GPT4o · $0.015
                        </span>
                    </button>

                    {/* Button 3: Cache Hit */}
                    <button
                        onClick={() => sendQuery(COMPLEX_QUERY)}
                        disabled={isLoading}
                        className="w-full border-4 border-white text-white p-6 text-left hover:bg-white hover:text-black transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                        <span className="text-lg font-black uppercase block mb-2">
                            [ RESEND COMPLEX QUERY ]
                        </span>
                        <span className="text-xs text-gray-500 group-hover:text-black transition-colors">
                            Triggers semantic cache on identical query
                        </span>
                        <span className="block mt-3 text-xs font-black border border-gray-600 group-hover:border-black px-2 py-1 w-fit uppercase tracking-wider">
                            Expected → CACHE_HIT · ~2ms · $0.000
                        </span>
                    </button>

                    {isLoading && (
                        <div className="border-2 border-gray-600 px-6 py-4">
                            <p className="text-xs text-gray-400 uppercase tracking-widest animate-pulse">
                                ▶ ROUTING QUERY...
                            </p>
                        </div>
                    )}
                </div>

                {/* RIGHT: Unit Economics Dashboard ───────────────────────── */}
                <div className="p-8 flex flex-col gap-6">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-gray-700 pb-4">
                        UNIT ECONOMICS DASHBOARD
                    </p>

                    {lastResult ? (
                        <>
                            {/* Last Result Readout */}
                            <div className={`border-4 p-6 ${modelBg(lastResult.model_used)}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-black uppercase tracking-widest opacity-70">
                                        LAST_RESULT
                                    </span>
                                    <span
                                        className={`text-base font-black uppercase ${modelColor(lastResult.model_used)}`}
                                    >
                                        {lastResult.model_used}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Metric label="LATENCY" value={`${lastResult.latency_ms.toFixed(0)}ms`} />
                                    <Metric label="COST_INCURRED" value={formatCost(lastResult.cost)} />
                                </div>
                                <p className="mt-4 text-xs opacity-70 italic line-clamp-2">
                                    &quot;{lastResult.answer}&quot;
                                </p>
                            </div>

                            {/* Session Savings */}
                            <div className="border-4 border-white p-6">
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                                    TOTAL_SESSION_SAVINGS
                                </p>
                                <p className="text-5xl font-black text-green-400">
                                    ${totalSavings.toFixed(3)}
                                </p>
                                <p className="text-xs text-gray-500 mt-2 uppercase tracking-wider">
                                    {logs.filter((l) => l.model_used !== "CLOUD_GPT4o").length} local/cache hits ·{" "}
                                    {logs.filter((l) => l.model_used === "CLOUD_GPT4o").length} cloud calls
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="border-4 border-dashed border-gray-700 p-8 flex items-center justify-center flex-1">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-600 text-center">
                                AWAITING_FIRST_QUERY
                                <br />
                                <span className="text-gray-700">← Click a control to route</span>
                            </p>
                        </div>
                    )}

                    {/* Log Feed */}
                    {logs.length > 0 && (
                        <div className="border-t-2 border-gray-800 pt-4">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-600 mb-3">
                                RECENT_LOG
                            </p>
                            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-center justify-between text-xs border border-gray-800 px-3 py-2"
                                    >
                                        <span className={`font-black uppercase ${modelColor(log.model_used)}`}>
                                            {log.model_used}
                                        </span>
                                        <span className="text-gray-500">{log.latency_ms.toFixed(0)}ms</span>
                                        <span className="text-gray-500">{formatCost(log.cost)}</span>
                                        {log.savedAmount > 0 && (
                                            <span className="text-green-500 font-black">+${log.savedAmount.toFixed(3)} saved</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Sub-component ─────────────────────────────────────────────────────────────
function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
            <p className="text-2xl font-black">{value}</p>
        </div>
    );
}
