import { agents } from "@/lib/registry";
import { isPromptInjection } from "./security";

export async function plan(prompt: string) {
    const securityCheck = isPromptInjection(prompt);
    if (securityCheck.detected) {
        console.error(`[SECURITY ALERT] Prompt injection check failed: ${securityCheck.reason}`);
        throw new Error(`PROMPT INJECTION DETECTED: ${securityCheck.reason}`);
    }
    // Pool of available capability nodes for the LLM
    const agentSpecs = [
        { id: "shopping", capabilities: "shopping, search products, find products, google shopping" },
        { id: "pricing", capabilities: "pricing, check cost, normalizes prices, conversion" },
        { id: "reviews", capabilities: "reviews, customer sentiment rating, customer feedback, stars" },
        { id: "deals", capabilities: "deals, coupon codes, brand savings, discounts, sales" },
        { id: "recommendation", capabilities: "ranking, select winner, score evaluation, rank products" },
        { id: "shipping", capabilities: "shipping estimation, carrier options, delivery time, zip codes" }
    ];

    const sarvamApiKey = process.env.SARVAM_API_KEY;
    const openAiApiKey = process.env.OPENAI_API_KEY;

    let selectedWorkflow = ["shopping", "pricing", "reviews", "deals", "recommendation", "shipping"];
    let modelUsed = "Rule-based Static Engine";

    const systemPrompt = `You are an agent orchestrator planner for an e-commerce platform.
Given a user query request, you must compile the exact list of agent IDs needed to satisfy the request.
The pool of available agent IDs and their capabilities are:
${agentSpecs.map(a => `- "${a.id}": handles capabilities [${a.capabilities}]`).join("\n")}

Rules:
1. Always start with "shopping" and "pricing" to get candidate products and normalize prices.
2. If the user mentions reviews, sentiment, ratings, feedback, or quality, include "reviews" in the sequence.
3. If the user mentions discounts, coupons, savings, deals, or cheap prices, include "deals" in the sequence.
4. If the user asks for comparison, ranking, or the "best" choice, include "recommendation" in the sequence.
5. If the user mentions shipping, delivery, transit, locations, or zip codes, include "shipping" in the sequence.
6. The sequence order must be logical (e.g. shopping -> pricing -> reviews -> deals -> recommendation -> shipping).
7. Return ONLY a valid JSON array of strings containing the selected agent IDs. Do not return any other text, markdown blocks, or explanation.
Example: ["shopping", "pricing", "recommendation"]`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Compile plan for request: "${prompt}"` }
    ];

    try {
        let responseText = "";
        
        // 1. Try Sarvam AI API
        if (sarvamApiKey) {
            console.log("[Planner] Contacting Sarvam AI API (Model: sarvam-105b)...");
            const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sarvamApiKey}`
                },
                body: JSON.stringify({
                    model: "sarvam-105b",
                    messages,
                    temperature: 0.1
                })
            });

            if (res.ok) {
                const data = await res.json();
                responseText = data.choices[0]?.message?.content || "";
                modelUsed = "Sarvam-105B (MoE)";
            } else {
                console.warn(`[Planner] Sarvam API returned status ${res.status}. Falling back...`);
            }
        }

        // 2. Fallback to OpenAI API
        if (!responseText && openAiApiKey) {
            console.log("[Planner] Falling back to OpenAI API (Model: gpt-4o-mini)...");
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openAiApiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages,
                    temperature: 0.1
                })
            });

            if (res.ok) {
                const data = await res.json();
                responseText = data.choices[0]?.message?.content || "";
                modelUsed = "GPT-4o-mini (Fallback)";
            } else {
                console.warn(`[Planner] OpenAI API returned status ${res.status}.`);
            }
        }

        if (responseText) {
            // Remove markdown code blocks if the LLM returned them
            const cleanJson = responseText.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Ensure all elements are valid agent IDs
                const validIds = agentSpecs.map(a => a.id);
                selectedWorkflow = parsed.filter(id => validIds.includes(id));
                console.log(`[Planner] LLM generated plan via ${modelUsed}:`, selectedWorkflow);
            }
        } else {
            console.log("[Planner] Using default full e-commerce pipeline (no LLM responses).");
            modelUsed = "Static E-Commerce Engine";
        }
    } catch (e) {
        console.error("[Planner] Failed during LLM planning, using default full sequence:", e);
        modelUsed = "Error Fallback Engine";
    }

    return {
        workflow: selectedWorkflow,
        modelUsed
    };
}