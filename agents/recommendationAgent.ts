export async function recommendationAgent(input: any) {
    console.log("[Recommendation Agent] Processing recommendations for input:", JSON.stringify(input));

    let targetInput = input;
    let contextHistory = [];
    let query = "";
    if (input && typeof input === "object" && "currentData" in input && "history" in input) {
        targetInput = input.currentData;
        contextHistory = input.history;
        query = input.query || "";
        console.log(`[Recommendation Agent] Context Transfer detected! Read history size: ${contextHistory.length} (Query: "${query}")`);
    } else if (input && typeof input === "object" && "query" in input) {
        query = input.query || "";
    }

    let products: any[] = [];
    if (typeof targetInput === "string") {
        products = [{ name: targetInput, price: 999 }];
    } else if (targetInput && Array.isArray(targetInput.results)) {
        products = targetInput.results;
    } else if (targetInput && Array.isArray(targetInput)) {
        products = targetInput;
    } else if (targetInput && typeof targetInput === "object") {
        products = [targetInput];
    }

    // Parse budget constraints (e.g. "under 1500" -> 1500)
    let maxPriceBudget = Infinity;
    if (query) {
        const priceRegex = /(?:under|below|less than|max|maximum|budget of|buy|price of|\$)\s*(\d+)/i;
        const match = query.match(priceRegex);
        if (match) {
            maxPriceBudget = parseFloat(match[1]);
        } else {
            // Check for any 3-4 digit numbers that might specify budget
            const numberMatch = query.match(/\b(\d{3,4})\b/);
            if (numberMatch) {
                maxPriceBudget = parseFloat(numberMatch[1]);
            }
        }
    }

    // Identify user preferences
    const isGamingRequested = /\bgaming\b|\bplay\b|\bgames\b/i.test(query);
    const isDeveloperRequested = /\bdeveloper\b|\bcoding\b|\bwork\b|\bprofessional\b/i.test(query);
    const isMacRequested = /\bmacbook\b|\bapple\b/i.test(query);
    const isChromebookRequested = /\bchromebook\b|\bcheap\b/i.test(query);

    // Score and rank candidates
    const recommendations = products.map((p: any, idx: number) => {
        const basePrice = p.price || 999;
        const finalPrice = p.deal?.finalPrice || basePrice;
        const rating = p.rating ? parseFloat(p.rating) : 4.0;
        
        let score = rating / 5.0; // start with rating score (max 1.0)
        let reason = "Highly rated by users";

        // Budget evaluation
        if (finalPrice > maxPriceBudget) {
            score = score * 0.3; // penalize heavily if over budget
            reason = `Exceeds budget of $${maxPriceBudget} (Price: $${finalPrice})`;
        } else if (maxPriceBudget !== Infinity) {
            score += 0.15; // boost if within budget
            reason = `Within budget of $${maxPriceBudget}`;
        }

        // Category keywords evaluation
        const name = (p.name || p.laptop || "").toLowerCase();
        if (isGamingRequested) {
            if (name.includes("legion") || name.includes("rog") || name.includes("zephyrus") || name.includes("razer") || name.includes("gaming")) {
                score += 0.25;
                reason += " • Best match for gaming";
            } else {
                score -= 0.15;
            }
        }
        if (isDeveloperRequested) {
            if (name.includes("macbook") || name.includes("xps") || name.includes("thinkpad")) {
                score += 0.2;
                reason += " • Pro developers favorite";
            }
        }
        if (isMacRequested) {
            if (name.includes("macbook") || name.includes("apple")) {
                score += 0.3;
                reason += " • Matches Macbook preference";
            } else {
                score -= 0.2;
            }
        }
        if (isChromebookRequested) {
            if (name.includes("chromebook")) {
                score += 0.3;
                reason += " • Matches Chromebook budget choice";
            }
        }

        // Bound score
        score = Math.min(1.0, Math.max(0.0, score));

        return {
            name: p.name || p.laptop || "Recommended Item",
            score,
            reason
        };
    }).sort((a, b) => b.score - a.score);

    return {
        success: true,
        recommendations,
        bestChoice: recommendations[0] || null,
        recommendationDate: new Date().toISOString()
    };
}
