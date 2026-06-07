import { NextRequest, NextResponse } from "next/server";
import { recommendationAgent } from "@/agents/recommendationAgent";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { input } = body;

        const result = await recommendationAgent(input);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
