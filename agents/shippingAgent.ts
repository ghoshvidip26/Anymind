export async function shippingAgent(input: any) {
    let bestChoice: any = null;
    let query = "shipping";

    // Unpack context transfer if present
    let targetInput = input;
    if (input && typeof input === "object" && "currentData" in input) {
        targetInput = input.currentData;
        query = input.query || "shipping";
    }

    if (targetInput && targetInput.bestChoice) {
        bestChoice = targetInput.bestChoice;
    } else if (targetInput && Array.isArray(targetInput.recommendations) && targetInput.recommendations.length > 0) {
        bestChoice = targetInput.recommendations[0];
    } else if (targetInput && Array.isArray(targetInput.results) && targetInput.results.length > 0) {
        bestChoice = targetInput.results[0];
    } else if (targetInput && typeof targetInput === "object") {
        bestChoice = targetInput;
    }

    if (!bestChoice) {
        bestChoice = { name: "Generic Product", price: 999 };
    }

    console.log(`[Shipping Agent] Calculating logistics for "${bestChoice.name}" (Query: "${query}")`);

    // Parse target zip code from query if present, otherwise default
    const zipMatch = query.match(/\b\d{5}\b/);
    const destinationZip = zipMatch ? zipMatch[0] : "10001 (New York, NY)";

    // Determine weight based on product type
    const productName = bestChoice.name.toLowerCase();
    let shippingWeightLbs = 5.0; // default for laptops
    let baseShippingFee = 12.50;

    if (productName.includes("macbook")) {
        shippingWeightLbs = 3.0;
        baseShippingFee = 9.99;
    } else if (productName.includes("legion") || productName.includes("gaming") || productName.includes("rog")) {
        shippingWeightLbs = 7.5;
        baseShippingFee = 19.99;
    }

    // Generate options
    const options = [
        {
            carrier: "FedEx Ground",
            service: "Standard Shipping",
            cost: 0, // Free tier
            transitDays: 4,
            deliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toDateString()
        },
        {
            carrier: "UPS Express",
            service: "Two-Day Air",
            cost: Math.round(baseShippingFee * 1.5 * 100) / 100,
            transitDays: 2,
            deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toDateString()
        },
        {
            carrier: "DHL Priority",
            service: "Next-Day Delivery",
            cost: Math.round((baseShippingFee * 3.2 + 15) * 100) / 100,
            transitDays: 1,
            deliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toDateString()
        }
    ];

    return {
        success: true,
        bestChoice,
        destinationZip,
        shippingWeightLbs,
        options,
        timestamp: new Date().toISOString()
    };
}
