import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { botchainTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [botchainTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [botchainTestnet.id]: http(botchainTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});
