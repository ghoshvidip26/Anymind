import { NextRequest, NextResponse } from "next/server";
import { recommendationAgent } from "@/agents/recommendationAgent";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { input } = body;

        if (input === undefined) {
            return NextResponse.json(
                { error: "Invalid input. 'input' must be provided." },
                { status: 400 }
            );
        }

        const result = await recommendationAgent(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in recommendation endpoint:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
