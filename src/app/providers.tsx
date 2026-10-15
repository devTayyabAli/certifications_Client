"use client";

import dynamic from "next/dynamic";
import { type ReactNode } from "react";
import { ProfileProvider } from "@/components/profile-provider";
import { WalletProvider, useWallet } from "@/components/wallet-provider";
import { Web3Boundary } from "@/components/web3-boundary";

// The wallet libraries (AppKit, wagmi, WalletConnect) are no longer set up here
// for every page: they load on demand from lib/web3 — on the wallet step, when
// claiming on-chain, or when a wallet modal opens.
const WalletConnectModal = dynamic(() => import("@/components/wallet-connect-modal"), { ssr: false });

/** The wallet chooser, loaded only once something opens it. */
function WalletModalHost() {
  const { isModalOpen } = useWallet();
  if (!isModalOpen) return null;
  return (
    <Web3Boundary>
      <WalletConnectModal />
    </Web3Boundary>
  );
}

/** Thin client wrapper — lets layout.tsx stay a Server Component */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <WalletProvider>
        {children}
        <WalletModalHost />
      </WalletProvider>
    </ProfileProvider>
  );
}
