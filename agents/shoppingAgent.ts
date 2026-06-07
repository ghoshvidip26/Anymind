import { ApifyClient } from "apify-client";

export async function shoppingAgent(query: any) {
    if (query && typeof query === "object" && "currentData" in query) {
        query = query.currentData;
    }
    console.log(`[Shopping Agent] Searching products for query: "${query}"`);

    const token = process.env.APIFY_API_TOKEN;
    if (token) {
        // Configurable actor ID — set APIFY_ACTOR_ID in .env to override
        const actorId = process.env.APIFY_ACTOR_ID || "epctex/google-shopping-scraper";
        try {
            console.log(`[Shopping Agent] Active APIFY_API_TOKEN found. Using actor: ${actorId}`);
            const client = new ApifyClient({ token });
            
            // Execute the Google Shopping Scraper actor
            const run = await client.actor(actorId).call({
                queries: [query],
                maxResultsPerQuery: 5,
                languageCode: "en",
                countryCode: "US",
            });

            // Retrieve items from dataset
            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            
            if (items && items.length > 0) {
                const scrapedItems = items.map((item: any) => ({
                    name: item.title || "Generic Product",
                    brand: item.brand || "Generic",
                    rating: item.rating ? parseFloat(item.rating) : 4.0,
                    price: item.price ? parseFloat(item.price.replace(/[^0-9.]/g, "")) : 999,
                    url: item.productUrl || "",
                }));

                return {
                    success: true,
                    query,
                    results: scrapedItems,
                    count: scrapedItems.length,
                    timestamp: new Date().toISOString(),
                    isRealScraped: true
                };
            }
            console.log(`[Shopping Agent] Scraper completed, but returned no items. Using catalog simulation.`);
        } catch (error) {
            console.warn(`[Shopping Agent] Apify actor "${actorId}" call failed, falling back to simulation:`, String(error));
        }
    } else {
        console.log(`[Shopping Agent] No APIFY_API_TOKEN found in environment. Using catalog simulation.`);
    }

    // Fallback Mockup Data
    const lowerQuery = query.toLowerCase();
    let items = [
        { name: "Standard Laptop", brand: "Generic", rating: 4.0 },
        { name: "Budget Chromebook", brand: "Acer", rating: 4.2 }
    ];

    if (lowerQuery.includes("gaming") || lowerQuery.includes("legion") || lowerQuery.includes("lenovo")) {
        items = [
            { name: "Lenovo Legion Pro 5", brand: "Lenovo", rating: 4.8 },
            { name: "ASUS ROG Zephyrus", brand: "ASUS", rating: 4.7 },
            { name: "Razer Blade 16", brand: "Razer", rating: 4.9 }
        ];
    } else if (lowerQuery.includes("work") || lowerQuery.includes("developer") || lowerQuery.includes("macbook")) {
        items = [
            { name: "MacBook Pro 14 (M3)", brand: "Apple", rating: 4.9 },
            { name: "Dell XPS 13", brand: "Dell", rating: 4.6 },
            { name: "ThinkPad X1 Carbon", brand: "Lenovo", rating: 4.7 }
        ];
    }

    return {
        success: true,
        query,
        results: items,
        count: items.length,
        timestamp: new Date().toISOString(),
        isRealScraped: false
    };
}
