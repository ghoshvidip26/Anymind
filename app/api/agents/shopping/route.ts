import { NextRequest, NextResponse } from "next/server";
import { shoppingAgent } from "@/agents/shoppingAgent";

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

        const result = await shoppingAgent(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in shopping endpoint:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
