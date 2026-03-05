import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.ROUTER_URL ?? "http://localhost:8001";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const res = await fetch(`${BACKEND}/v1/route`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json(
            { error: "Semantic router backend is offline. Deploy it on Render." },
            { status: 503 }
        );
    }
}
