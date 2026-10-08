"use client";

import { useEffect, type ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { base } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { OptionsController } from "@reown/appkit-controllers";
import { ProfileProvider } from "@/components/profile-provider";
import { WalletProvider } from "@/components/wallet-provider";
import WalletConnectModal from "@/components/wallet-connect-modal";

// 0. Setup QueryClient
const queryClient = new QueryClient();

// 1. Get projectId from environment or fallback to working project ID
export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WEB3_PROJECT_ID ||
  "ae64d2d938316ce3350fea4c10f6cc79";

// 2. Metadata for WalletConnect modal display
export const metadata = {
  name: "Si Her DeFi",
  description: "DeFi, taught by the people leading it.",
  url: typeof window !== "undefined" ? window.location.origin : "https://siherdefi.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 3. Supported networks (Base as primary network)
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  base
];

// 4. Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

// Wallet Explorer IDs for Reown AppKit featured list
export const ONE_INCH_WALLET_ID = "c286eebc742a537cd1d6818363e9dc53b21759a1e8e5d9b263d0c03ec7703576";
export const TRUST_WALLET_ID = "4622a2b276ced14d16d48270e964bc510e590a79040e6c69f0076a5890f87e09";

export const featuredWalletIds = [
  TRUST_WALLET_ID,
  ONE_INCH_WALLET_ID,
];

// 5. Initialize AppKit modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  defaultNetwork: base,
  featuredWalletIds,
  features: {
    email: false,
    socials: false,
    emailShowWallets: true,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#6d25d6",
    "--w3m-border-radius-master": "12px",
  }
});

// Guarantee email and social logins are disabled even if remote Reown cloud config enables them
if (typeof window !== "undefined") {
  OptionsController.setFeaturedWalletIds(featuredWalletIds);
  const sanitizeFeatures = () => {
    const current = OptionsController.state.remoteFeatures;
    if (current && (current.email !== false || (Array.isArray(current.socials) && current.socials.length > 0))) {
      OptionsController.setRemoteFeatures({
        ...current,
        email: false,
        socials: false,
      });
    }
  };

  sanitizeFeatures();
  OptionsController.subscribeKey("remoteFeatures", () => {
    sanitizeFeatures();
  });
}

/** Thin client wrapper — lets layout.tsx stay a Server Component */
export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const sanitizeFeatures = () => {
      const current = OptionsController.state.remoteFeatures;
      if (current && (current.email !== false || (Array.isArray(current.socials) && current.socials.length > 0))) {
        OptionsController.setRemoteFeatures({
          ...current,
          email: false,
          socials: false,
        });
      }
    };

    sanitizeFeatures();
    const unsub = OptionsController.subscribeKey("remoteFeatures", () => {
      sanitizeFeatures();
    });

    return () => unsub();
  }, []);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ProfileProvider>
          <WalletProvider>
            {children}
            <WalletConnectModal />
          </WalletProvider>
        </ProfileProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

