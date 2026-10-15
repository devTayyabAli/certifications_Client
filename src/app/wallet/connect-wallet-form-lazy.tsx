"use client";

// The wallet form needs the wallet libraries (AppKit, wagmi), so it loads with
// them on this page only; placeholder rows hold its place meanwhile.
import dynamic from "next/dynamic";
import { Web3Boundary } from "@/components/web3-boundary";

const ConnectWalletForm = dynamic(() => import("./connect-wallet-form"), { ssr: false });

function Placeholder() {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Loading wallets">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-[58px] animate-pulse rounded-xl border border-[#ececf2] bg-[#f6f6fa]" />
      ))}
    </div>
  );
}

export default function ConnectWalletFormLazy() {
  return (
    <Web3Boundary fallback={<Placeholder />}>
      <ConnectWalletForm />
    </Web3Boundary>
  );
}
