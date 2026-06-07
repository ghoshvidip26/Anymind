import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description, endpoint, capabilities } = body;

        return NextResponse.json({
            success: true,
            message: "Register request received.",
            data: { name, description, endpoint, capabilities }
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
