import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

export const monadTestnet = {
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: {
        name: "MON",
        symbol: "MON",
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [
                "https://testnet-rpc.monad.xyz"
            ],
        },
    },
};

export const config = createConfig({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chains: [monadTestnet as any],
    connectors: [injected()],
    transports: {
        [monadTestnet.id]: http(),
    },
});