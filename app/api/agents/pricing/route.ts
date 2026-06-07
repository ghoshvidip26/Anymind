import { NextRequest, NextResponse } from "next/server";
import { pricingAgent } from "@/agents/pricingAgent";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { input } = body;
        
        if (!input || typeof input !== "string") {
            return NextResponse.json(
                { error: "Invalid input. 'input' query string must be provided." },
                { status: 400 }
            );
        }

        const result = await pricingAgent(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in pricing endpoint:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
