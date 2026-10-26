# FlipBit 🪙

**FlipBit** is a clean, minimal, and fully functioning on-chain coin-flipping Web3 decentralized application (dApp) built on the **Botchain Mainnet**.

Users connect their Web3 wallet, trigger an on-chain transaction to flip a virtual coin, and watch the verified result (**🟡 HEADS** or **🔵 TAILS**) appear straight from the confirmed blockchain event.

---

## 🚀 Features

- **On-Chain Coin Flip**: Verified by a Solidity smart contract emitting `CoinFlipped` events.
- **Pseudo-Random Outcome Generation**: Generates pseudo-random outcomes using block attributes and entropy nonces (designed strictly for entertainment and educational purposes).
- **Botchain Mainnet Integration**: Fully configured for Botchain Mainnet (Chain ID `677`, RPC `https://rpc.botchain.ai`, native token `BOT`).
- **Interactive UI**:
  - Virtual 3D coin flipping animation during pending block confirmation.
  - Distinct visual states: Initial `?`, `🟡 HEADS`, or `🔵 TAILS`.
  - Transaction hash link to the Botchain block explorer (`https://scan.botchain.ai`).
  - Real-time on-chain statistics (Total flips and connected wallet's latest result).
- **Responsive & Minimal**: Built with a sleek dark navy theme, subtle gold and blue accents, and modern typography using Tailwind CSS.
- **Strict Simplicity**: No external database, no centralized backend, no betting/rewards, no unnecessary bloat.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Web3 Interaction**: [wagmi](https://wagmi.sh), [viem](https://viem.sh), [@tanstack/react-query](https://tanstack.com/query)
- **Smart Contract**: Solidity (`^0.8.20`)
- **Development & Testing Framework**: Hardhat

---

## ⛓️ Blockchain Network Information (Botchain Mainnet)

| Parameter | Value |
| :--- | :--- |
| **Network Name** | Botchain Mainnet |
| **Chain ID** | `677` |
| **Currency Symbol** | `BOT` |
| **Currency Decimals**| `18` |
| **Total Supply** | 150 Million BOT |
| **BOT Chain Website** | `https://botchain.ai` |
| **BOT Chain Explorer** | `https://scan.botchain.ai` |
| **RPC Endpoint** | `https://rpc.botchain.ai` |
| **Deployed Contract** | [`0x01D9a4Dd82c0a225454F620631332187464643fF`](https://scan.botchain.ai/address/0x01D9a4Dd82c0a225454F620631332187464643fF) |

---

## 📦 Installation Instructions

Ensure you have [Node.js](https://nodejs.org) (v18+ or later) installed on your system.

1. Clone or navigate to the repository directory:
   ```bash
   cd "Isaac work/Flipbit"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` configuration file from the template:
   ```bash
   cp .env.example .env
   ```

---

## 🧪 How to Run Smart Contract Tests

Run the complete Hardhat test suite to verify contract functionality:

```bash
npm test
```

The test suite validates:
1. `FlipBit` contract initialization with `0` flips.
2. A flip transaction succeeds and increments `totalFlips`.
3. Caller's latest result is recorded on-chain.
4. The contract emits the `CoinFlipped` event with the caller's address, result (`0` for Heads, `1` for Tails), and flip count.
5. Multiple flips are counted accurately.
6. Independent wallets can flip and store their separate latest outcomes.

---

## 🚢 How to Deploy the Contract to Botchain Mainnet

### 1. Set Up Deployer Credentials
Open `.env` and set your deployer private key (ensure the account has `BOT` tokens for gas):

```env
BOTCHAIN_RPC_URL=https://rpc.botchain.ai
NEXT_PUBLIC_BOTCHAIN_RPC_URL=https://rpc.botchain.ai
PRIVATE_KEY=your_private_key_here
```

### 2. Run the Deployment Script
Run the automated deployment script targeting the Botchain Mainnet network:

```bash
npm run deploy:mainnet
```

Upon successful deployment, the script outputs the deployed contract address and explorer link:
```text
====================================================
✅ FlipBit deployed successfully!
Contract Address: 0x01D9a4Dd82c0a225454F620631332187464643fF
Network: botchain
Chain ID: 677
Explorer URL: https://scan.botchain.ai/address/0x01D9a4Dd82c0a225454F620631332187464643fF
====================================================
```

### 3. Verify Contract Source Code on the Block Explorer
To verify the contract source code on Botchain Explorer:

```bash
npm run verify:mainnet 0x01D9a4Dd82c0a225454F620631332187464643fF
```

**Currently Deployed Contract**:
- Address: [`0x01D9a4Dd82c0a225454F620631332187464643fF`](https://scan.botchain.ai/address/0x01D9a4Dd82c0a225454F620631332187464643fF)
- Network: Botchain Mainnet (Chain ID 677)
- Explorer Link: [https://scan.botchain.ai/address/0x01D9a4Dd82c0a225454F620631332187464643fF](https://scan.botchain.ai/address/0x01D9a4Dd82c0a225454F620631332187464643fF)

---

## ⚙️ How to Configure the Contract Address in the Frontend

### Method 1: Via Environment Variables (Recommended)
Add your deployed contract address to `.env`:

```env
NEXT_PUBLIC_FLIPBIT_CONTRACT_ADDRESS=0x01D9a4Dd82c0a225454F620631332187464643fF
```

Then rebuild or restart the development server.

### Method 2: In-App UI Configuration
If testing without updating `.env`, open the application in your browser, click **"Set Address"** on the top notification banner, paste the deployed contract address, and click **"Apply Address"**.

---

## 💻 How to Run the Frontend Locally

Start the local Next.js development server:

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

To create and run an optimized production build:
```bash
npm run build
npm run start
```

---

## 🌐 How to Deploy to Vercel

1. Push your code to a Git repository (e.g., GitHub, GitLab).
2. Go to [Vercel](https://vercel.com) and import the repository.
3. In the project settings on Vercel:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Environment Variables**:
     - `NEXT_PUBLIC_FLIPBIT_CONTRACT_ADDRESS`: `0x01D9a4Dd82c0a225454F620631332187464643fF`
     - `NEXT_PUBLIC_BOTCHAIN_RPC_URL`: `https://rpc.botchain.ai`
4. Click **Deploy**.

---

## 🔒 Security & Randomness Disclaimer

The coin-flip outcome is generated on-chain using block timestamp, block prevrandao, caller address, and an internal nonce. This approach is intended **solely for educational, hackathon, and demonstration purposes**. It is not cryptographically secure randomness (such as Chainlink VRF) and should never be used for financial staking, lotteries, or wagering.
