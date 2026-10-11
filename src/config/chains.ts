import { defineChain } from "viem";

/**
 * Botchain Testnet configuration
 * Chain ID: 968
 * RPC: https://rpc.bohr.life
 * Explorer: https://scan.bohr.life
 * Native Currency: BOT
 */
export const botchainTestnet = defineChain({
  id: 968,
  name: "Botchain Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "BOT",
    symbol: "BOT",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_BOTCHAIN_RPC_URL || "https://rpc.bohr.life"],
    },
  },
  blockExplorers: {
    default: {
      name: "Botchain Explorer",
      url: "https://scan.bohr.life",
    },
  },
  testnet: true,
});
