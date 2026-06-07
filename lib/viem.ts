import { createPublicClient, http } from "viem";
export const publicClient = createPublicClient({
    transport: http("https://testnet-rpc.monad.xyz")
})