import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "FlipBit - On-Chain Coin Flip on Botchain Testnet",
  description:
    "FlipBit is a clean, minimal Web3 dApp for on-chain coin flipping on Botchain Testnet. Heads or Tails, verified directly by the blockchain.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="bg-[#060913] text-slate-100 min-h-screen antialiased selection:bg-amber-500/30 selection:text-amber-200 font-sans"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
