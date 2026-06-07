import { NextResponse } from "next/server";
import { publicClient } from "@/lib/viem";
import { registryAbi } from "@/lib/registryAbi";
import { registryAddress } from "@/lib/registryAddress";

export async function GET() {
    try {
        const nextAgentId = await publicClient.readContract({
            address: registryAddress,
            abi: registryAbi,
            functionName: "nextAgentId",
        }) as bigint;

        const count = Number(nextAgentId);
        const agents = [];
        for (let i = 0; i < count; i++) {
            const agent = await publicClient.readContract({
                address: registryAddress,
                abi: registryAbi,
                functionName: "getAgent",
                args: [BigInt(i)],
            }) as any;

            let tokenURI = "";
            try {
                tokenURI = await publicClient.readContract({
                    address: registryAddress,
                    abi: registryAbi,
                    functionName: "tokenURI",
                    args: [BigInt(i)],
                }) as string;
            } catch (e) {
                console.warn(`Could not read tokenURI for agent ${i}:`, e);
            }
            
            agents.push({
                id: agent.id.toString(),
                owner: agent.owner,
                name: agent.name,
                description: agent.description,
                endpoint: tokenURI || "/api/mcp",
                tokenURI: tokenURI,
                serviceFee: agent.serviceFee ? agent.serviceFee.toString() : "0",
                capabilities: agent.capabilities,
                active: agent.active,
            });
        }
        return NextResponse.json({ agents });
    } catch (error) {
        console.warn("Error fetching agents from contract (contract might not be deployed yet):", error);
        return NextResponse.json({ agents: [], error: String(error) });
    }
}