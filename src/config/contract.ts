import { Address } from "viem";

/**
 * FlipBit Smart Contract ABI
 */
export const FLIPBIT_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "enum FlipBit.CoinSide",
        name: "result",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "flipNumber",
        type: "uint256",
      },
    ],
    name: "CoinFlipped",
    type: "event",
  },
  {
    inputs: [],
    name: "flip",
    outputs: [
      {
        internalType: "enum FlipBit.CoinSide",
        name: "result",
        type: "uint8",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalFlips",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserLatestResult",
    outputs: [
      {
        internalType: "enum FlipBit.CoinSide",
        name: "result",
        type: "uint8",
      },
      {
        internalType: "bool",
        name: "flipped",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "hasFlipped",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "latestResult",
    outputs: [
      {
        internalType: "enum FlipBit.CoinSide",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalFlips",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Default or configured contract address
 */
export const DEFAULT_CONTRACT_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_FLIPBIT_CONTRACT_ADDRESS as Address) ||
  "0xC7EE088F698c1943a03Ad5516250EA3307bF5EA4";

export enum CoinSide {
  Heads = 0,
  Tails = 1,
}
