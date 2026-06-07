import { NextRequest, NextResponse } from "next/server";
import { shippingAgent } from "@/agents/shippingAgent";

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

        const result = await shippingAgent(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in shipping endpoint:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
