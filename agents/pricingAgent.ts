export async function pricingAgent(input: any) {
    console.log(`[Pricing Agent] Processing input:`, typeof input === "object" ? JSON.stringify(input) : input);
    
    let targetInput = input;
    let contextHistory = [];
    if (input && typeof input === "object" && "currentData" in input && "history" in input) {
        targetInput = input.currentData;
        contextHistory = input.history;
        console.log(`[Pricing Agent] Context Transfer detected! Read history size: ${contextHistory.length}`);
    }

    // 1. If input is a string query (e.g. called directly)
    if (typeof targetInput === "string") {
        const lowerQuery = targetInput.toLowerCase();
        let laptop = "Generic Laptop";
        let price = 999;

        if (lowerQuery.includes("lenovo") || lowerQuery.includes("legion")) {
            laptop = "Lenovo Legion Pro 5";
            price = 1399;
        } else if (lowerQuery.includes("macbook") || lowerQuery.includes("apple")) {
            laptop = "MacBook Air M3";
            price = 1099;
        } else if (lowerQuery.includes("dell") || lowerQuery.includes("xps")) {
            laptop = "Dell XPS 13";
            price = 1299;
        }

        return {
            success: true,
            laptop,
            price,
            currency: "USD",
            message: `Pricing retrieved for ${laptop}: $${price}`
        };
    }

    // 2. If input is a pipeline result from the shoppingAgent
    if (targetInput && Array.isArray(targetInput.results)) {
        const pricedResults = targetInput.results.map((item: any) => {
            const name = item.name.toLowerCase();
            let price = 999;
            if (name.includes("lenovo") || name.includes("legion")) price = 1399;
            else if (name.includes("asus") || name.includes("zephyrus")) price = 1450;
            else if (name.includes("razer") || name.includes("blade")) price = 2499;
            else if (name.includes("macbook") || name.includes("apple")) price = 1599;
            else if (name.includes("dell") || name.includes("xps")) price = 1299;
            else if (name.includes("thinkpad")) price = 1199;
            return { ...item, price, currency: "USD" };
        });

        return {
            success: true,
            results: pricedResults,
            count: pricedResults.length,
            timestamp: new Date().toISOString()
        };
    }

    return {
        success: false,
        error: "Invalid pricing input schema"
    };
}

