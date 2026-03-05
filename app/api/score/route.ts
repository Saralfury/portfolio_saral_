import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.RISK_ENGINE_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const idempotencyKey = req.headers.get("X-Idempotency-Key") ?? "";

        const res = await fetch(`${BACKEND}/v1/score`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(idempotencyKey && { "X-Idempotency-Key": idempotencyKey }),
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json(
            { error: "Risk engine backend is offline. Deploy it on Render." },
            { status: 503 }
        );
    }
}
