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
  AlertCircle,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { botchainTestnet } from "@/config/chains";
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
    chainId: botchainTestnet.id,
  });

  // Contract address state (allows custom address input if not set in .env)
  const [contractAddress, setContractAddress] = useState<Address>(DEFAULT_CONTRACT_ADDRESS);
  const [addressInput, setAddressInput] = useState<string>(DEFAULT_CONTRACT_ADDRESS);
  const [showConfig, setShowConfig] = useState<boolean>(false);

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
  const isCorrectNetwork = chainId === botchainTestnet.id;

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
        await switchChain({ chainId: botchainTestnet.id });
      } catch (err: unknown) {
        const error = err as Error;
        setErrorMsg(`Failed to switch network: ${error?.message || "User rejected request."}`);
        return;
      }
    }

    if (!isValidAddress) {
      setErrorMsg(
        "Invalid or unconfigured contract address. Please provide a valid deployed contract address on Botchain Testnet."
      );
      setShowConfig(true);
      return;
    }

    if (balanceData && balanceData.value === 0n) {
      setErrorMsg(
        "Your connected wallet has 0 BOT. You need a small amount of testnet BOT tokens to cover the gas fee for flipping."
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

      // 1. Submit on-chain transaction with explicit gas limit for Botchain Testnet
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

      setFlipStep("Reading verified result from on-chain event...");

      // 3. Decode CoinFlipped event from transaction logs
      let decodedResult: CoinSide | null = null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: FLIPBIT_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "CoinFlipped") {
            decodedResult = Number(decoded.args.result) as CoinSide;
            break;
          }
        } catch {
          // Skip logs from other contracts or events
        }
      }

      if (decodedResult === null) {
        // Fallback: read directly from the user's latest stored state
        const updated = await refetchUserResult();
        if (updated.data && Array.isArray(updated.data) && updated.data[1]) {
          decodedResult = Number(updated.data[0]) as CoinSide;
        } else {
          throw new Error("Could not extract CoinFlipped event from transaction receipt.");
        }
      }

      // 4. Update UI with genuine verified result
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

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddress(addressInput)) {
      setContractAddress(addressInput as Address);
      setErrorMsg(null);
      setShowConfig(false);
    } else {
      setErrorMsg("Invalid Ethereum-compatible address format.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100 selection:bg-amber-500/20">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-blue-600/10 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] bg-amber-600/10 blur-3xl rounded-full" />
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
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60">
                Botchain Testnet
              </span>
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
                  {isCorrectNetwork ? "Botchain (968)" : "Wrong Network"}
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
                <p className="text-rose-300/80">Please switch your wallet to Botchain Testnet (Chain ID 968).</p>
              </div>
            </div>
            <button
              id="switch-network-btn"
              onClick={() => switchChain({ chainId: botchainTestnet.id })}
              disabled={isSwitchingChain}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors shrink-0"
            >
              {isSwitchingChain ? "Switching..." : "Switch to Botchain"}
            </button>
          </div>
        )}

        {/* Unconfigured Contract Warning Notice */}
        {!isValidAddress && (
          <div className="w-full mb-8 p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200 shadow-lg shadow-amber-950/20">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-300">Contract Address Configuration</p>
                <p className="text-amber-300/80">
                  Deploy the contract to Botchain Testnet or set the contract address below.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 transition-colors shrink-0"
            >
              {showConfig ? "Hide Config" : "Set Address"}
            </button>
          </div>
        )}

        {/* Collapsible Contract Address Input */}
        {showConfig && (
          <div className="w-full mb-8 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Configure FlipBit Contract Address</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your deployed FlipBit contract address on Botchain Testnet (Chain ID 968):
            </p>
            <form onSubmit={handleSaveAddress} className="flex flex-col sm:flex-row gap-2">
              <input
                id="contract-address-input"
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value.trim())}
                placeholder="0x..."
                className="flex-1 px-4 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-5 py-2 text-sm font-medium rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
              >
                Apply Address
              </button>
            </form>
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
            <div
              className={`w-full h-full rounded-full p-2.5 flex items-center justify-center transition-all duration-700 shadow-2xl ${
                currentDisplayedSide === CoinSide.Heads
                  ? "bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 shadow-amber-500/30"
                  : currentDisplayedSide === CoinSide.Tails
                  ? "bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-300 shadow-blue-500/30"
                  : "bg-gradient-to-tr from-slate-700 via-slate-600 to-amber-500/60 shadow-slate-900/50"
              }`}
            >
              {/* Inner coin face */}
              <div
                className={`w-full h-full rounded-full flex flex-col items-center justify-center border-4 border-dashed transition-all duration-500 ${
                  currentDisplayedSide === CoinSide.Heads
                    ? "bg-[#141204] border-amber-400/50 text-amber-300"
                    : currentDisplayedSide === CoinSide.Tails
                    ? "bg-[#061124] border-blue-400/50 text-blue-300"
                    : "bg-[#090D1A] border-slate-700 text-slate-400"
                }`}
              >
                {/* Result Representation */}
                {isFlipping ? (
                  <div className="flex flex-col items-center space-y-2">
                    <RefreshCw className="w-12 h-12 text-amber-400 animate-spin" />
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400/90">
                      FLIPPING...
                    </span>
                  </div>
                ) : currentDisplayedSide === CoinSide.Heads ? (
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-3xl">🟡</span>
                    <span className="text-2xl font-black tracking-widest text-amber-400 font-mono">
                      HEADS
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-amber-400/70 tracking-widest">
                      ON-CHAIN RESULT
                    </span>
                  </div>
                ) : currentDisplayedSide === CoinSide.Tails ? (
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-3xl">🔵</span>
                    <span className="text-2xl font-black tracking-widest text-blue-400 font-mono">
                      TAILS
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-blue-400/70 tracking-widest">
                      ON-CHAIN RESULT
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <HelpCircle className="w-16 h-16 text-amber-400/70" />
                    <span className="text-xs uppercase font-mono tracking-widest text-slate-400">
                      READY TO FLIP
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FLIP BUTTON */}
        <div className="w-full max-w-sm mb-6 flex flex-col items-center">
          <button
            id="flip-coin-button"
            onClick={handleFlipCoin}
            disabled={isFlipping}
            className={`w-full py-4 px-8 rounded-2xl font-bold text-lg tracking-wide uppercase transition-all duration-200 shadow-xl flex items-center justify-center space-x-3 active:scale-[0.98] ${
              isFlipping
                ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700"
                : !isConnected
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25"
                : !isCorrectNetwork
                ? "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-rose-500/25"
                : "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/30"
            }`}
          >
            {isFlipping ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span>FLIPPING COIN...</span>
              </>
            ) : !isConnected ? (
              <>
                <Wallet className="w-5 h-5" />
                <span>CONNECT WALLET TO FLIP</span>
              </>
            ) : !isCorrectNetwork ? (
              <>
                <ShieldAlert className="w-5 h-5" />
                <span>SWITCH TO BOTCHAIN</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>FLIP COIN</span>
              </>
            )}
          </button>

          {/* Pending Step description */}
          {isFlipping && flipStep && (
            <p className="mt-3 text-xs font-mono text-amber-300/90 animate-pulse text-center">
              {flipStep}
            </p>
          )}
        </div>

        {/* ERROR MESSAGE DISPLAY */}
        {errorMsg && (
          <div
            id="error-message-box"
            className="w-full max-w-md mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs sm:text-sm flex items-start space-x-3 shadow-lg"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 break-words">
              <p className="font-semibold text-rose-200">Flip Error</p>
              <p className="mt-0.5 text-rose-300/90">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* SUCCESS & TRANSACTION DETAILS */}
        {successResult && (
          <div
            id="success-details-card"
            className="w-full max-w-md mb-8 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-300"
          >
            <div className="flex items-center space-x-2 text-emerald-400 mb-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold text-sm">Flip Confirmed On-Chain!</span>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Result:</span>
                <span className="font-bold flex items-center space-x-1">
                  <span>{successResult.side === CoinSide.Heads ? "🟡 HEADS" : "🔵 TAILS"}</span>
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
                  href={`https://scan.bohr.life/tx/${successResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline"
                >
                  <span>View on Botchain Explorer</span>
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

        {/* Contract Address Reference Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>
            FlipBit Contract:{" "}
            {isValidAddress ? (
              <a
                href={`https://scan.bohr.life/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-slate-400 hover:text-amber-400 underline inline-flex items-center space-x-1 ml-1"
              >
                <span>{shortenAddress(contractAddress)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-amber-500/80 cursor-pointer hover:underline" onClick={() => setShowConfig(true)}>
                Not configured (click to set)
              </span>
            )}
          </p>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>FlipBit &copy; 2026. On-chain pseudo-random coin flipping demo.</p>
          <div className="flex items-center space-x-4">
            <a
              href="https://scan.bohr.life"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors inline-flex items-center space-x-1"
            >
              <span>Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://rpc.bohr.life"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors inline-flex items-center space-x-1"
            >
              <span>RPC</span>
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
