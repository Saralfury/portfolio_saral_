"use client";

import { useState } from "react";

interface ProjectMonolithProps {
    title: string;
    role: string;
    stack: string;
    problem: string;
    fix: string;
    sourceCode?: string;       // optional: architecture snippet for the Glass Box
    children?: React.ReactNode;
}

export default function ProjectMonolith({
    title,
    role,
    stack,
    problem,
    fix,
    sourceCode,
    children,
}: ProjectMonolithProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showSourceCode, setShowSourceCode] = useState(false);
    const stackItems = stack.split(",").map((s) => s.trim());

    return (
        <article className="w-full border-4 border-black bg-white mb-0">
            {/* ── Clickable Header Row ── */}
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-8 md:p-12 text-left group cursor-pointer hover:bg-black hover:text-white transition-colors duration-150"
                aria-expanded={isOpen}
            >
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl md:text-4xl font-black font-mono uppercase tracking-tight leading-none">
                        {title}
                    </h2>
                    <span className="font-mono text-xs font-black uppercase tracking-widest opacity-60">
                        {role}
                    </span>
                </div>

                <span className="font-mono text-xl font-black border-4 border-current px-4 py-2 shrink-0 ml-8 group-hover:bg-white group-hover:text-black transition-colors duration-150">
                    {isOpen ? "[ — ]" : "[ + ]"}
                </span>
            </button>

            {/* ── Expanded Content ── */}
            {isOpen && (
                <>
                    <div className="px-8 md:px-12 pb-12">
                        <hr className="border-t-4 border-black mb-8" />

                        {/* Stack Tags */}
                        <div className="flex flex-wrap gap-3 mb-10">
                            {stackItems.map((item, i) => (
                                <span
                                    key={i}
                                    className="font-mono text-xs font-black border-2 border-black px-3 py-1.5 uppercase tracking-widest bg-white text-black"
                                >
                                    {item}
                                </span>
                            ))}
                        </div>

                        {/* The Problem */}
                        <div className="mb-8">
                            <p className="font-mono text-xs font-black uppercase tracking-widest text-black mb-3">
                                [ THE PROBLEM ]
                            </p>
                            <p className="font-mono text-base leading-relaxed text-gray-600">
                                {problem}
                            </p>
                        </div>

                        {/* What I Built */}
                        <div className="mb-10">
                            <p className="font-mono text-xs font-black uppercase tracking-widest text-black mb-3">
                                [ WHAT I BUILT ]
                            </p>
                            <p className="font-mono text-base leading-relaxed text-black font-bold">
                                {fix}
                            </p>
                        </div>

                        {/* ── Glass Box: View Architecture Source ── */}
                        {sourceCode && (
                            <div>
                                <button
                                    onClick={() => setShowSourceCode((prev) => !prev)}
                                    className="border-4 border-black px-6 py-3 font-mono text-sm font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors duration-100"
                                >
                                    {showSourceCode
                                        ? "[ HIDE ARCHITECTURE SOURCE ]"
                                        : "[ VIEW ARCHITECTURE SOURCE ]"}
                                </button>

                                {showSourceCode && (
                                    <div className="mt-4">
                                        <p className="font-mono text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                      // ARCHITECTURE_SNIPPET — risk-engine/main.py
                                        </p>
                                        <pre className="bg-black text-green-400 p-6 font-mono text-xs overflow-x-auto border-2 border-black leading-relaxed">
                                            <code>{sourceCode}</code>
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Optional injected terminal — edge-to-edge, outside padded zone */}
                    {children && <div>{children}</div>}
                </>
            )}
        </article>
    );
}
