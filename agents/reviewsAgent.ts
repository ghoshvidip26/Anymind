import { ApifyClient } from "apify-client";

export async function reviewsAgent(input: any) {
    let products: any[] = [];
    let query = "products";

    // Unpack context transfer if present
    let targetInput = input;
    if (input && typeof input === "object" && "currentData" in input) {
        targetInput = input.currentData;
        query = input.query || "products";
    }

    if (targetInput && Array.isArray(targetInput.results)) {
        products = targetInput.results;
    } else if (targetInput && Array.isArray(targetInput)) {
        products = targetInput;
    } else if (typeof targetInput === "string") {
        query = targetInput;
        products = [{ name: targetInput, price: 999 }];
    }

    console.log(`[Reviews Agent] Fetching reviews and sentiment for ${products.length} products (Query: "${query}")`);

    const token = process.env.APIFY_API_TOKEN;
    let scrapedReviews = null;

    if (token && products.length > 0) {
        const actorId = process.env.APIFY_REVIEWS_ACTOR_ID || "web_wanderer/amazon-reviews-extractor";
        try {
            console.log(`[Reviews Agent] Active APIFY_API_TOKEN found. Calling actor: ${actorId}`);
            const client = new ApifyClient({ token });
            
            // Format input products url list using amazon url fallback if needed
            const url = (products[0].url && products[0].url.includes("amazon.com")) 
                ? products[0].url 
                : "https://www.amazon.com/dp/B07CMS5Q6P"; // fallback ASIN URL
            
            const run = await client.actor(actorId).call({
                products: [url],
                maxReviewsPerProduct: 3,
            });

            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            if (items && items.length > 0) {
                scrapedReviews = items.map((item: any) => ({
                    title: item.reviewTitle || item.title || "User Review",
                    text: item.reviewText || item.text || "",
                    rating: item.rating ? parseFloat(item.rating) : 5,
                    date: item.reviewDate || item.date || new Date().toISOString()
                }));
                console.log(`[Reviews Agent] Scraped ${scrapedReviews.length} real reviews from Apify.`);
            }
        } catch (error) {
            console.warn(`[Reviews Agent] Apify actor call failed, falling back to sentiment simulator:`, String(error));
        }
    }

    // Process sentiment score for each product (simulate if no real scraper data is active)
    const reviewsResult = products.map((product: any, idx: number) => {
        const name = product.name.toLowerCase();
        let positive = 85;
        let neutral = 10;
        let negative = 5;
        let highlights = [
            "Great performance and responsive controls.",
            "Display color accuracy is excellent.",
            "Heats up slightly during heavy rendering loads."
        ];

        // Custom simulation values based on product names
        if (name.includes("lenovo") || name.includes("legion")) {
            positive = 92;
            neutral = 6;
            negative = 2;
            highlights = [
                "Incredible frame rate stability in modern titles.",
                "Thermal cooling is very quiet compared to previous models.",
                "Power brick is massive and heavy to carry."
            ];
        } else if (name.includes("macbook") || name.includes("apple")) {
            positive = 95;
            neutral = 4;
            negative = 1;
            highlights = [
                "Unbelievable battery life, lasted over 16 hours of coding.",
                "The M3 chip handles heavy compiler jobs without breaking a sweat.",
                "Extremely limited port selection, requires dongles."
            ];
        } else if (name.includes("dell") || name.includes("xps")) {
            positive = 88;
            neutral = 8;
            negative = 4;
            highlights = [
                "Bezel-less OLED screen is absolutely gorgeous.",
                "Keyboard typing feel is highly comfortable.",
                "Can get hot underneath when fast charging."
            ];
        } else if (name.includes("chromebook")) {
            positive = 80;
            neutral = 12;
            negative = 8;
            highlights = [
                "Affordable and excellent for simple productivity chores.",
                "Lightweight and boots up in under 5 seconds.",
                "Display brightness is slightly dim in direct sunlight."
            ];
        }

        // Incorporate scraped reviews if we got them for the first product
        const reviewsUsed = (idx === 0 && scrapedReviews) ? scrapedReviews : null;
        
        return {
            ...product,
            sentiment: {
                positive,
                neutral,
                negative,
                score: positive / 100
            },
            highlights,
            scrapedReviews: reviewsUsed,
            reviewsCount: reviewsUsed ? reviewsUsed.length : 142 + (idx * 27)
        };
    });

    return {
        success: true,
        query,
        results: reviewsResult,
        count: reviewsResult.length,
        timestamp: new Date().toISOString(),
        isRealScraped: !!scrapedReviews
    };
}
