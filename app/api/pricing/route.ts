import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();

    return NextResponse.json({
        products: [
            {
                name: "Lenovo Legion 5",
                price: 1399
            },
            {
                name: "ASUS ROG Strix",
                price: 1450
            }
        ]
    });
}