"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useReadContract,
  useWriteContract,
  usePublicClient,
  useBalance,
} from "wagmi";
import { isAddress, decodeEventLog, Address, formatEther } from "viem";
import {
  Coins,
  Wallet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { botchain } from "@/config/chains";
import { FLIPBIT_ABI, DEFAULT_CONTRACT_ADDRESS, CoinSide } from "@/config/contract";

export default function FlipBitPage() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Connected wallet BOT balance
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    chainId: botchain.id,
  });

  // Contract address strictly locked to verified Mainnet deployment
  const contractAddress: Address = DEFAULT_CONTRACT_ADDRESS;

  // Flip execution state
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipStep, setFlipStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    side: CoinSide;
    txHash: string;
  } | null>(null);

  // Visual coin display side: null = ?, 0 = Heads, 1 = Tails
  const [currentDisplayedSide, setCurrentDisplayedSide] = useState<CoinSide | null>(null);

  const isValidAddress = isAddress(contractAddress) && contractAddress !== "0x0000000000000000000000000000000000000000";
  const isCorrectNetwork = chainId === botchain.id;

  // Contract Reads
  const {
    data: totalFlipsData,
    refetch: refetchTotalFlips,
    isLoading: isLoadingTotal,
  } = useReadContract({
    address: contractAddress,
    abi: FLIPBIT_ABI,
    functionName: "getTotalFlips",
    query: {
      enabled: isValidAddress,
    },
  });

  const {
    data: userResultData,
    refetch: refetchUserResult,
    isLoading: isLoadingUserResult,
  } = useReadContract({
    address: contractAddress,
    abi: FLIPBIT_ABI,
    functionName: "getUserLatestResult",
    args: address ? [address] : undefined,
    query: {
      enabled: isValidAddress && !!address,
    },
  });

  // Keep displayed coin synced with user's on-chain result initially if not flipped in this session
  useEffect(() => {
    if (userResultData && Array.isArray(userResultData)) {
      const [latestSide, hasFlipped] = userResultData;
      if (hasFlipped && successResult === null) {
        setCurrentDisplayedSide(Number(latestSide) as CoinSide);
      }
    }
  }, [userResultData, successResult]);

  // Handler to perform on-chain coin flip
  const handleFlipCoin = async () => {
    setErrorMsg(null);

    if (!isConnected) {
      if (connectors.length > 0) {
        connect({ connector: connectors[0] });
      }
      return;
    }

    if (!isCorrectNetwork) {
      try {
        await switchChain({ chainId: botchain.id });
      } catch (err: unknown) {
        const error = err as Error;
        setErrorMsg(`Failed to switch network: ${error?.message || "User rejected request."}`);
        return;
      }
    }

    if (!isValidAddress) {
      setErrorMsg("Smart contract address is not configured properly.");
      return;
    }

    if (balanceData && balanceData.value === 0n) {
      setErrorMsg(
        "Your connected wallet has 0 BOT. You need a small amount of BOT to cover the gas fee for flipping."
      );
      return;
    }

    if (!publicClient) {
      setErrorMsg("Blockchain public client is not ready. Please refresh the page.");
      return;
    }

    try {
      setIsFlipping(true);
      setFlipStep("Please confirm the transaction in your wallet...");

      // 1. Submit on-chain transaction with explicit gas limit for Botchain Mainnet
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: FLIPBIT_ABI,
        functionName: "flip",
        gas: 150000n,
      });

      setFlipStep("Transaction submitted. Waiting for block confirmation...");

      // 2. Wait for block confirmation receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      if (receipt.status === "reverted") {
        throw new Error("Transaction was reverted on-chain.");
      }

      setFlipStep("Decoding on-chain CoinFlipped event...");

      // 3. Search logs for CoinFlipped event
      let decodedResult: CoinSide | null = null;

      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: FLIPBIT_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (parsed.eventName === "CoinFlipped") {
            const args = parsed.args as { result: number; user: string; flipNumber: bigint };
            decodedResult = Number(args.result) as CoinSide;
            break;
          }
        } catch {
          // Skip logs that do not match the event signature
        }
      }

      // Fallback: If event was not found in logs, query contract directly
      if (decodedResult === null) {
        if (address) {
          const latest = await publicClient.readContract({
            address: contractAddress,
            abi: FLIPBIT_ABI,
            functionName: "latestResult",
            args: [address],
          });
          decodedResult = Number(latest) as CoinSide;
        } else {
          decodedResult = CoinSide.Heads;
        }
      }

      // Update state with result
      setCurrentDisplayedSide(decodedResult);
      setSuccessResult({
        side: decodedResult,
        txHash: txHash,
      });

      // Refetch stats and balance
      await Promise.all([refetchTotalFlips(), refetchUserResult(), refetchBalance()]);
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      console.error("Flip failed:", error);
      setErrorMsg(error?.shortMessage || error?.message || "An unexpected error occurred during the flip.");
    } finally {
      setIsFlipping(false);
      setFlipStep("");
    }
  };

  const shortenAddress = (addr?: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100 selection:bg-amber-500/20">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-blue-600/10 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] bg-amber-600/10 blur-3xl rounded-full" />
      </div>

      {/* TOP ANNOUNCEMENT BAR AT THE FRONT OF THE INTERFACE */}
      <div className="relative z-20 bg-slate-950/95 border-b border-emerald-900/40 backdrop-blur-md px-4 py-2">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <img
              src="/botchain-logo.png"
              alt="BOT Chain Logo"
              className="w-4 h-4 object-contain rounded-sm"
            />
            <span className="text-slate-300 font-medium">
              Running on <strong className="text-emerald-400 font-semibold">BOT Chain Mainnet</strong> (Chain ID 677)
            </span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="text-slate-400 hidden md:inline font-mono">
              Contract: {shortenAddress(contractAddress)}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <a
              id="top-bar-botchain-website"
              href="https://botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 hover:text-emerald-200 transition-colors font-medium"
            >
              <img
                src="/botchain-logo.png"
                alt="BOT Chain Logo"
                className="w-3.5 h-3.5 object-contain rounded-sm"
              />
              <span>BOT Chain Website</span>
              <ExternalLink className="w-3 h-3 text-emerald-400/80" />
            </a>
            <a
              id="top-bar-botchain-explorer"
              href="https://scan.botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-teal-950/60 hover:bg-teal-900/60 border border-teal-800/60 text-teal-300 hover:text-teal-200 transition-colors font-medium"
            >
              <img
                src="/botchain-logo.png"
                alt="BOT Chain Logo"
                className="w-3.5 h-3.5 object-contain rounded-sm"
              />
              <span>BOT Chain Explorer</span>
              <ExternalLink className="w-3 h-3 text-teal-400/80" />
            </a>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                FlipBit
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                Botchain Mainnet
              </span>
            </div>

            {/* Direct Header links with BOT Chain logo */}
            <div className="hidden lg:flex items-center space-x-2 ml-3 pl-3 border-l border-slate-800">
              <a
                id="header-botchain-website"
                href="https://botchain.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-xs text-slate-300 hover:text-emerald-400 transition-colors"
                title="BOT Chain Official Website"
              >
                <img
                  src="/botchain-logo.png"
                  alt="BOT Chain Logo"
                  className="w-3.5 h-3.5 object-contain rounded-sm"
                />
                <span>BOT Chain Website</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
              <a
                id="header-botchain-explorer"
                href="https://scan.botchain.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/50 text-xs text-slate-300 hover:text-teal-400 transition-colors"
                title="BOT Chain Mainnet Explorer"
              >
                <img
                  src="/botchain-logo.png"
                  alt="BOT Chain Logo"
                  className="w-3.5 h-3.5 object-contain rounded-sm"
                />
                <span>BOT Chain Explorer</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </div>
          </div>

          {/* Right Header: Network status & Wallet Connect */}
          <div className="flex items-center space-x-3">
            {isConnected && (
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCorrectNetwork ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                  }`}
                />
                <span className={isCorrectNetwork ? "text-slate-300" : "text-rose-400 font-medium"}>
                  {isCorrectNetwork ? "Botchain Mainnet (677)" : "Wrong Network"}
                </span>
              </div>
            )}

            {isConnected ? (
              <div className="flex items-center space-x-2">
                {balanceData && (
                  <div className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-amber-300">
                    <span>{Number(formatEther(balanceData.value)).toFixed(4)}</span>
                    <span className="text-amber-500 font-semibold">{balanceData.symbol}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm font-mono text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{shortenAddress(address)}</span>
                </div>
                <button
                  id="disconnect-wallet-btn"
                  onClick={() => disconnect()}
                  title="Disconnect wallet"
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="connect-wallet-btn"
                onClick={() => {
                  if (connectors.length > 0) {
                    connect({ connector: connectors[0] });
                  }
                }}
                disabled={isConnecting}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Wallet className="w-4 h-4" />
                <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* Network Warning Banner */}
        {isConnected && !isCorrectNetwork && (
          <div className="w-full mb-8 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-200 shadow-lg shadow-rose-950/20">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-rose-300">Unsupported Network</p>
                <p className="text-rose-300/80">Please switch your wallet to Botchain Mainnet (Chain ID 677).</p>
              </div>
            </div>
            <button
              id="switch-network-btn"
              onClick={() => switchChain({ chainId: botchain.id })}
              disabled={isSwitchingChain}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors shrink-0"
            >
              {isSwitchingChain ? "Switching..." : "Switch to Botchain Mainnet"}
            </button>
          </div>
        )}

        {/* HEADING SECTION */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
            Flip the Coin
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-md mx-auto">
            Heads or Tails? Let the blockchain decide.
          </p>
        </div>

        {/* VIRTUAL COIN DISPLAY */}
        <div className="relative mb-8 flex items-center justify-center coin-perspective">
          <div
            id="flip-coin-visual"
            className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center select-none transition-transform duration-500 ${
              isFlipping ? "animate-flipspin" : "hover:scale-105"
            }`}
          >
            {/* Outer coin rim & 3D styling */}
            <div className="w-full h-full rounded-full p-2 bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-500 shadow-2xl shadow-amber-500/20 border-4 border-amber-400/40 flex items-center justify-center">
              {/* Inner coin face */}
              <div
                className={`w-full h-full rounded-full flex flex-col items-center justify-center p-4 border-2 transition-colors duration-300 ${
                  currentDisplayedSide === CoinSide.Heads
                    ? "bg-gradient-to-b from-amber-950 via-slate-900 to-amber-950 border-amber-400/60"
                    : currentDisplayedSide === CoinSide.Tails
                    ? "bg-gradient-to-b from-blue-950 via-slate-900 to-blue-950 border-blue-400/60"
                    : "bg-slate-950 border-slate-700/60"
                }`}
              >
                {/* Visual state: Idle (?) vs Heads vs Tails */}
                {isFlipping ? (
                  <div className="flex flex-col items-center">
                    <RefreshCw className="w-12 h-12 text-amber-400 animate-spin mb-2" />
                    <span className="text-xs uppercase font-mono tracking-widest text-amber-400/80 animate-pulse">
                      Flipping...
                    </span>
                  </div>
                ) : currentDisplayedSide === CoinSide.Heads ? (
                  <div className="flex flex-col items-center animate-fadein">
                    <span className="text-4xl sm:text-5xl mb-1">🟡</span>
                    <span className="text-xl sm:text-2xl font-black tracking-wider text-amber-300">
                      HEADS
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500/80 mt-1">
                      On-Chain
                    </span>
                  </div>
                ) : currentDisplayedSide === CoinSide.Tails ? (
                  <div className="flex flex-col items-center animate-fadein">
                    <span className="text-4xl sm:text-5xl mb-1">🔵</span>
                    <span className="text-xl sm:text-2xl font-black tracking-wider text-blue-300">
                      TAILS
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-blue-500/80 mt-1">
                      On-Chain
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <HelpCircle className="w-12 h-12 text-slate-500 mb-1" />
                    <span className="text-base font-semibold text-slate-400">Ready</span>
                    <span className="text-[10px] text-slate-500">Click flip below</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE ACTION BUTTON */}
        <div className="w-full max-w-xs mb-8 flex flex-col items-center space-y-3">
          <button
            id="flip-coin-btn"
            onClick={handleFlipCoin}
            disabled={isFlipping || !isCorrectNetwork}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-xl ${
              isFlipping
                ? "bg-amber-600/50 text-slate-900 cursor-not-allowed"
                : !isCorrectNetwork
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-95 cursor-pointer"
            }`}
          >
            {isFlipping ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Confirming Flip...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Flip Coin</span>
              </>
            )}
          </button>

          {/* Flipping step description */}
          {isFlipping && (
            <p className="text-xs text-amber-300/90 font-mono animate-pulse text-center">
              {flipStep}
            </p>
          )}

          {/* Error notice */}
          {errorMsg && (
            <div className="w-full p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs text-center flex items-center justify-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* OUTCOME & TRANSACTION RECEIPT */}
        {successResult && (
          <div
            id="flip-success-banner"
            className="w-full max-w-md mb-8 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl shadow-emerald-950/20 animate-fadein"
          >
            <div className="flex items-center space-x-3 mb-3 pb-3 border-b border-slate-800">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-white">Flip Confirmed on BOT Chain!</h3>
                <p className="text-xs text-slate-400">Verified by smart contract</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Outcome:</span>
                <span className="font-black text-sm">
                  {successResult.side === CoinSide.Heads ? (
                    <span className="text-amber-400">🟡 HEADS</span>
                  ) : (
                    <span className="text-blue-400">🔵 TAILS</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Tx Hash:</span>
                <span className="font-mono text-slate-300">
                  {shortenAddress(successResult.txHash)}
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <a
                  id="explorer-tx-link"
                  href={`https://scan.botchain.ai/tx/${successResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 hover:underline"
                >
                  <img
                    src="/botchain-logo.png"
                    alt="BOT Chain Logo"
                    className="w-3.5 h-3.5 object-contain rounded-sm"
                  />
                  <span>View on BOT Chain Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* SMALL STATISTICS SECTION */}
        <div
          id="contract-statistics-card"
          className="w-full max-w-md grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm"
        >
          {/* Total flips recorded by contract */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60 flex flex-col items-center text-center">
            <span className="text-xs text-slate-400 mb-1">Total Flips</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {isLoadingTotal
                ? "..."
                : totalFlipsData !== undefined
                ? totalFlipsData.toString()
                : "0"}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Contract Total</span>
          </div>

          {/* Connected wallet's latest result */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60 flex flex-col items-center text-center">
            <span className="text-xs text-slate-400 mb-1">Your Last Flip</span>
            <div className="text-xl sm:text-2xl font-black font-mono flex items-center space-x-1">
              {isLoadingUserResult ? (
                <span className="text-slate-400">...</span>
              ) : userResultData && Array.isArray(userResultData) && userResultData[1] ? (
                Number(userResultData[0]) === CoinSide.Heads ? (
                  <span className="text-amber-400">🟡 HEADS</span>
                ) : (
                  <span className="text-blue-400">🔵 TAILS</span>
                )
              ) : (
                <span className="text-slate-500 text-sm font-sans font-medium">None yet</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">Wallet History</span>
          </div>
        </div>

        {/* Mainnet Contract Address Reference */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <div className="inline-flex items-center flex-wrap justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-500">FlipBit Mainnet Contract:</span>
            <a
              id="mainnet-contract-link"
              href={`https://scan.botchain.ai/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-emerald-400 hover:text-emerald-300 underline inline-flex items-center space-x-1"
            >
              <img
                src="/botchain-logo.png"
                alt="BOT Chain Logo"
                className="w-3.5 h-3.5 object-contain rounded-sm"
              />
              <span>{contractAddress}</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>
        </div>

        {/* BOT CHAIN ECOSYSTEM SECTION */}
        <section
          id="botchain-ecosystem-section"
          className="w-full max-w-xl mt-8 p-6 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle glow effect */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />

          {/* Header with BOT Chain Logo & Name */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/70">
            <div className="flex items-center space-x-3">
              {/* BOT Chain Official Image Logo */}
              <div className="relative w-12 h-12 rounded-2xl bg-[#0B1120] border border-emerald-500/30 p-1 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <img
                  src="/botchain-logo.png"
                  alt="BOT Chain Official Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white tracking-tight">BOT Chain</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                    Ecosystem
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  AI-Powered High-Throughput Layer-1 • Chain ID 677
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-mono font-medium">Mainnet Online</span>
            </div>
          </div>

          {/* Mandatory Ecosystem Links Preceded by BOT Chain Logo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* BOT Chain Website Link */}
            <a
              id="botchain-website-link"
              href="https://botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/50 transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-emerald-800/50 p-1 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <img
                    src="/botchain-logo.png"
                    alt="BOT Chain Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                    BOT Chain Website
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">
                    botchain.ai
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </a>

            {/* BOT Chain Explorer Link */}
            <a
              id="botchain-explorer-link"
              href="https://scan.botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 hover:border-teal-500/50 transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-teal-800/50 p-1 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <img
                    src="/botchain-logo.png"
                    alt="BOT Chain Explorer Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
                    BOT Chain Explorer
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">
                    scan.botchain.ai
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
            </a>
          </div>

          {/* Deployed Contract Quick Access */}
          <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <span className="text-slate-400 font-medium">Mainnet Contract:</span>
            <a
              href={`https://scan.botchain.ai/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-emerald-400 hover:text-emerald-300 underline inline-flex items-center space-x-1"
            >
              <img
                src="/botchain-logo.png"
                alt="BOT Chain Logo"
                className="w-3.5 h-3.5 object-contain rounded-sm"
              />
              <span>{contractAddress}</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-800/60 py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* BOT Chain Logo Icon */}
            <div className="w-7 h-7 rounded-lg bg-[#0B1120] border border-emerald-500/40 p-0.5 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <img
                src="/botchain-logo.png"
                alt="BOT Chain Logo"
                className="w-full h-full object-contain rounded"
              />
            </div>
            <div className="flex items-center space-x-2 text-left">
              <span className="text-slate-300 font-semibold text-sm tracking-tight">BOT Chain</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">FlipBit &copy; 2026</span>
            </div>
          </div>

          {/* Footer Navigation Links with BOT Chain Logo in front */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a
              id="footer-botchain-website"
              href="https://botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors inline-flex items-center space-x-1.5 text-slate-300 font-medium"
            >
              <img
                src="/botchain-logo.png"
                alt="BOT Chain Logo"
                className="w-3.5 h-3.5 object-contain rounded-sm"
              />
              <span>BOT Chain Website</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <a
              id="footer-botchain-explorer"
              href="https://scan.botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition-colors inline-flex items-center space-x-1.5 text-slate-300 font-medium"
            >
              <img
                src="/botchain-logo.png"
                alt="BOT Chain Explorer Logo"
                className="w-3.5 h-3.5 object-contain rounded-sm"
              />
              <span>BOT Chain Explorer</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <a
              id="footer-botchain-rpc"
              href="https://rpc.botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition-colors inline-flex items-center space-x-1 text-slate-400"
            >
              <span>Mainnet RPC</span>
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
