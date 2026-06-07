import { pricingAgent } from "./pricingAgent";

export async function dealsAgent(input: any) {
    let products: any[] = [];
    let query = "deals";

    // Unpack context transfer if present
    let targetInput = input;
    if (input && typeof input === "object" && "currentData" in input) {
        targetInput = input.currentData;
        query = input.query || "deals";
    }

    // Agent-to-Agent Communication: Deals Agent calls Pricing Agent directly to verify and fetch normalized prices.
    console.log(`[Deals Agent] ⇄ [Agent-to-Agent] Querying Pricing Agent directly for price verification...`);
    const pricingResponse = await pricingAgent(input);
    if (pricingResponse && pricingResponse.success && Array.isArray(pricingResponse.results)) {
        products = pricingResponse.results;
        console.log(`[Deals Agent] ⇄ [Agent-to-Agent] Pricing Agent returned ${products.length} verified product prices.`);
    } else {
        // Fallback to local unpacking if direct call fails or has no results
        if (targetInput && Array.isArray(targetInput.results)) {
            products = targetInput.results;
        } else if (targetInput && Array.isArray(targetInput)) {
            products = targetInput;
        } else if (typeof targetInput === "string") {
            query = targetInput;
            products = [{ name: targetInput, price: 999 }];
        }
    }

    console.log(`[Deals Agent] Finding discount codes for ${products.length} products (Query: "${query}")`);

    // Match brands and look up coupon codes
    const dealsResult = products.map((product: any) => {
        const name = product.name.toLowerCase();
        let couponCode = "SAVEMORE";
        let discountPercent = 5;
        let activeDeal = false;
        let dealDescription = "5% off storewide coupon applied.";

        if (name.includes("lenovo") || name.includes("legion")) {
            couponCode = "LEGION10";
            discountPercent = 10;
            activeDeal = true;
            dealDescription = "10% off Lenovo Legion series laptops.";
        } else if (name.includes("macbook") || name.includes("apple")) {
            couponCode = "MACDEAL50";
            discountPercent = 3.5; // custom amount (~$50 off)
            activeDeal = true;
            dealDescription = "Save $50 on Apple MacBook models.";
        } else if (name.includes("dell") || name.includes("xps") || name.includes("thinkpad")) {
            couponCode = "BIZWORK15";
            discountPercent = 15;
            activeDeal = true;
            dealDescription = "15% off professional workstation models.";
        } else if (name.includes("asus") || name.includes("zephyrus")) {
            couponCode = "ROGZEPHYR8";
            discountPercent = 8;
            activeDeal = true;
            dealDescription = "8% off ROG Zephyrus models.";
        }

        // Calculate coupon savings and updated price
        const price = product.price || 999;
        const discountAmount = Math.round((price * (discountPercent / 100)) * 100) / 100;
        const finalPrice = Math.round((price - discountAmount) * 100) / 100;

        return {
            ...product,
            deal: {
                active: activeDeal,
                couponCode,
                discountPercent,
                discountAmount,
                dealDescription,
                finalPrice
            }
        };
    });

    return {
        success: true,
        query,
        results: dealsResult,
        count: dealsResult.length,
        timestamp: new Date().toISOString()
    };
}
