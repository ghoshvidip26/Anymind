import { NextRequest, NextResponse } from "next/server";
import { reviewsAgent } from "@/agents/reviewsAgent";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { input } = body;

        if (!input) {
            return NextResponse.json(
                { error: "Invalid input. 'input' context envelope must be provided." },
                { status: 400 }
            );
        }

        const result = await reviewsAgent(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in reviews endpoint:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
