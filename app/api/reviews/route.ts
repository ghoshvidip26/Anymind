import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build-validation"
});

export async function POST(req: Request) {
    const { product } = await req.json();

    const response = await openai.responses.create({
        model: "gpt-5",
        input: `Review ${product}`
    });

    return Response.json({
        review: response.output_text
    });
}