import { createPublicClient, http } from "viem";
import { registryAddress } from "../lib/registryAddress";
import { registryAbi } from "../lib/registryAbi";

const publicClient = createPublicClient({
    transport: http("https://testnet-rpc.monad.xyz")
});

async function test() {
    try {
        console.log("Registry Address:", registryAddress);
        const nextAgentId = await publicClient.readContract({
            address: registryAddress as `0x${string}`,
            abi: registryAbi,
            functionName: "nextAgentId",
        });
        console.log("nextAgentId:", nextAgentId);
    } catch (e) {
        console.error("Error readContract:", e);
    }
}
test();
