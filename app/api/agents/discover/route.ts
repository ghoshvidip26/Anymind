import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query } = body;
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/list`);
        const data = await response.json();

        const agents =
            data.agents.filter(
                (agent: any) =>
                    agent.capabilities.some(
                        (cap: string) =>
                            query
                                .toLowerCase()
                                .includes(
                                    cap.toLowerCase()
                                )
                    )
            );
        return NextResponse.json({ agents });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error }, { status: 500 });
    }
}