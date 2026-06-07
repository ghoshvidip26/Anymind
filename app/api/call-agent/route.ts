import { pricingAgent } from "@/agents/pricingAgent";
import { shoppingAgent } from "@/agents/shoppingAgent";
import { recommendationAgent } from "@/agents/recommendationAgent";
import { reviewsAgent } from "@/agents/reviewsAgent";
import { dealsAgent } from "@/agents/dealsAgent";
import { shippingAgent } from "@/agents/shippingAgent";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { agentName, input } = await req.json();

        console.log(`\n[AGENTS ENGINE] Incoming request for Node [${agentName.toUpperCase()}]`);
        
        // Check for Context Transfer format
        if (input && typeof input === "object" && "currentData" in input && "history" in input) {
            console.log(`[CONTEXT TRANSFER] Reading envelope:`);
            console.log(` - Original Intent: "${input.query}"`);
            console.log(` - Execution History Depth: ${input.history?.length || 0}`);
            console.log(` - Metadata Caller: ${input.metadata?.caller || "unknown"}`);
            
            // Log simulated economic transfers
            const mockFees: Record<string, string> = { 
                "shopping": "0.00 MON (FREE)", 
                "pricing": "0.02 MON", 
                "reviews": "0.03 MON",
                "deals": "0.015 MON",
                "recommendation": "0.05 MON",
                "shipping": "0.025 MON" 
            };
            const fee = mockFees[agentName] || "0.00 MON";
            if (fee !== "0.00 MON (FREE)" && fee !== "0.00 MON") {
                console.log(`[ECONOMIC PAYMENTS] 💰 Charging caller: ${fee} sent to agent owner.`);
            } else {
                console.log(`[ECONOMIC PAYMENTS] 🟢 Free Tier service. No transaction required.`);
            }
        } else {
            console.log(`[LEGACY REQUEST] Raw payload received:`, typeof input === "object" ? "JSON Object" : input);
        }

        let result;
        switch (agentName) {
            case "pricing":
                result = await pricingAgent(input);
                break;
            case "shopping":
                result = await shoppingAgent(input);
                break;
            case "reviews":
                result = await reviewsAgent(input);
                break;
            case "deals":
                result = await dealsAgent(input);
                break;
            case "recommendation":
                result = await recommendationAgent(input);
                break;
            case "shipping":
                result = await shippingAgent(input);
                break;
            default:
                return NextResponse.json({ error: `Agent not found: ${agentName}` }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[AGENTS ENGINE] Error handling call-agent request:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}