"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type SystemStatus = "IDLE" | "HEALTHY" | "RUNNING" | "UPDATE_REJECTED";

interface CheckResponse {
    status: string;
    current_accuracy: string;
    message: string;
    new_accuracy?: string;
    stages_passed?: string[];
}

// ── Pipeline Step Labels (non-technical) ─────────────────────────────────────
const PIPELINE_STEPS = [
    { id: 1, label: "MONITORING" },
    { id: 2, label: "ACCURACY DROP DETECTED" },
    { id: 3, label: "TRAINING NEW AI" },
    { id: 4, label: "SAFETY CHECK" },
];

const API_URL = `/api/system-check`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function AiHealthMonitor() {
    const [status, setStatus] = useState<SystemStatus>("IDLE");
    const [activeStep, setActiveStep] = useState<number>(0);
    const [result, setResult] = useState<CheckResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function runCheck(simulateChange: boolean) {
        setIsLoading(true);
        setError(null);
        setResult(null);
        setActiveStep(0);
        setStatus("RUNNING");

        // Animate pipeline steps while the server processes (each stage ~800ms)
        if (simulateChange) {
            for (let step = 1; step <= PIPELINE_STEPS.length; step++) {
                await new Promise((r) => setTimeout(r, 850));
                setActiveStep(step);
            }
        }

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ simulate_environment_change: simulateChange }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: CheckResponse = await res.json();

            setResult(data);
            setStatus(data.status === "HEALTHY" ? "HEALTHY" : "UPDATE_REJECTED");
            if (!simulateChange) setActiveStep(1); // mark step 1 as active/done for healthy
        } catch {
            setError(
                "Connection refused. Start the backend: cd ai-health-monitor && uvicorn main:app --port 8002"
            );
            setStatus("IDLE");
            setActiveStep(0);
        } finally {
            setIsLoading(false);
        }
    }

    const isRejected = status === "UPDATE_REJECTED";
    const isHealthy = status === "HEALTHY";

    return (
        <div className="border-t-4 border-black bg-black text-white font-mono">
            {/* ── Title Bar ──────────────────────────────────────────────────────── */}
            <div className="border-b-4 border-white px-8 py-4 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest">
                    {/* AI_HEALTH_MONITOR :: AUTOMATED_SAFETY_ENGINE */}
                </span>
                <span className="text-xs text-gray-500 uppercase tracking-widest">
                    API → localhost:8002
                </span>
            </div>

            {/* ── Error Banner ──────────────────────────────────────────────────── */}
            {error && (
                <div className="border-b-4 border-yellow-400 bg-yellow-900 px-8 py-4">
                    <p className="text-yellow-300 text-xs font-black uppercase tracking-wider">⚠ {error}</p>
                </div>
            )}

            <div className="p-8 flex flex-col gap-8">

                {/* ── CONTROLS ──────────────────────────────────────────────────────── */}
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-gray-700 pb-4 mb-6">
                        THE CONTROLS
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Button 1: Normal Data */}
                        <button
                            onClick={() => runCheck(false)}
                            disabled={isLoading}
                            className="border-4 border-white text-white p-6 text-left hover:bg-white hover:text-black transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed group"
                        >
                            <span className="text-lg font-black uppercase block mb-2">
                                [ FEED NORMAL DATA ]
                            </span>
                            <span className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
                                Simulates a stable environment → AI stays healthy
                            </span>
                        </button>

                        {/* Button 2: Seasonal Change */}
                        <button
                            onClick={() => runCheck(true)}
                            disabled={isLoading}
                            className="border-4 border-red-500 text-red-400 p-6 text-left hover:bg-red-600 hover:text-white transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed group"
                        >
                            <span className="text-lg font-black uppercase block mb-2">
                                [ SIMULATE CHANGING SEASONS ]
                            </span>
                            <span className="text-xs text-red-700 group-hover:text-red-100 transition-colors">
                                Triggers the full automated safety pipeline
                            </span>
                        </button>
                    </div>
                </div>

                {/* ── PIPELINE TRACKER ───────────────────────────────────────────────── */}
                {status !== "IDLE" && (
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-gray-700 pb-4 mb-6">
                            AUTOMATION TRACKER
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {PIPELINE_STEPS.map((step) => {
                                const isActive = activeStep === step.id;
                                const isDone = activeStep > step.id;
                                const isFailed = isRejected && step.id === 4 && activeStep >= 4;

                                let boxStyle = "border-2 border-gray-700 text-gray-600";
                                if (isFailed) boxStyle = "border-4 border-red-500 bg-red-900 text-red-300";
                                else if (isActive && isLoading)
                                    boxStyle = "border-4 border-white bg-white text-black animate-pulse";
                                else if (isActive || isDone)
                                    boxStyle = "border-4 border-white bg-white text-black";

                                return (
                                    <div key={step.id} className={`p-4 transition-all duration-300 ${boxStyle}`}>
                                        <p className="text-xs font-black opacity-60 mb-1">{step.id}.</p>
                                        <p className="text-xs font-black uppercase leading-tight">{step.label}</p>
                                        {isActive && isLoading && (
                                            <p className="text-xs mt-2 opacity-60 animate-pulse">running...</p>
                                        )}
                                        {isFailed && <p className="text-xs mt-2 font-black">✗ FAILED</p>}
                                        {(isDone || (isActive && !isLoading)) && !isFailed && (
                                            <p className="text-xs mt-2 font-black">✓</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── SYSTEM LOG / VERDICT ───────────────────────────────────────────── */}
                {result && (
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-gray-700 pb-4 mb-6">
                            SYSTEM LOG
                        </p>

                        {isHealthy && (
                            <div className="border-4 border-white p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="text-3xl font-black text-green-400">✓ ALL CLEAR</span>
                                    <span className="border-2 border-green-400 text-green-400 px-3 py-1 text-xs font-black uppercase">
                                        STATUS: {result.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed">{result.message}</p>
                                <div className="mt-4 border-t-2 border-gray-700 pt-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest">
                                        Current AI Reliability
                                    </p>
                                    <p className="text-5xl font-black text-green-400 mt-1">
                                        {result.current_accuracy}
                                    </p>
                                </div>
                            </div>
                        )}

                        {isRejected && (
                            <div className="border-4 border-red-500 p-6 bg-red-950">
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="text-2xl font-black text-red-400 animate-pulse">
                                        ✗ UPDATE CANCELLED
                                    </span>
                                    <span className="border-2 border-red-400 text-red-400 px-3 py-1 text-xs font-black uppercase">
                                        PATIENT SAFETY ENFORCED
                                    </span>
                                </div>
                                <p className="text-sm text-red-200 leading-relaxed font-bold mb-6">
                                    {result.message}
                                </p>

                                {/* Accuracy Comparison */}
                                <div className="grid grid-cols-2 gap-4 border-t-2 border-red-800 pt-6">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                                            CURRENT AI (Kept)
                                        </p>
                                        <p className="text-4xl font-black text-green-400">{result.current_accuracy}</p>
                                        <p className="text-xs text-green-600 mt-1 uppercase font-black">✓ Retained</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                                            NEW AI (Rejected)
                                        </p>
                                        <p className="text-4xl font-black text-red-400">{result.new_accuracy}</p>
                                        <p className="text-xs text-red-600 mt-1 uppercase font-black">✗ Rejected</p>
                                    </div>
                                </div>

                                <div className="border-t-2 border-red-800 mt-6 pt-4">
                                    <p className="text-xs font-black uppercase text-red-400 tracking-widest">
                                        NEW AI IS WORSE THAN CURRENT AI. AUTOMATIC UPDATE BLOCKED.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Idle placeholder */}
                {status === "IDLE" && (
                    <div className="border-4 border-dashed border-gray-700 p-8 flex items-center justify-center">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-600 text-center">
                            SYSTEM_IDLE
                            <br />
                            <span className="text-gray-700">← Click a control to run the monitor</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
