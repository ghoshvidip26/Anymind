import { NextRequest, NextResponse } from "next/server";
import { plan } from "@/orchestrator/planner";

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();
        const { workflow, modelUsed } = await plan(prompt);
        return NextResponse.json({
            success: true,
            workflow,
            modelUsed,
            prompt
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}