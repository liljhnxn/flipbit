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
 * Verified FlipBit Smart Contract deployed on Botchain Mainnet (Chain ID 677)
 * Explorer: https://scan.botchain.ai/address/0x01D9a4Dd82c0a225454F620631332187464643fF
 */
export const BOTCHAIN_MAINNET_CONTRACT_ADDRESS: Address =
  "0x01D9a4Dd82c0a225454F620631332187464643fF";

export const DEFAULT_CONTRACT_ADDRESS: Address = BOTCHAIN_MAINNET_CONTRACT_ADDRESS;

export enum CoinSide {
  Heads = 0,
  Tails = 1,
}
