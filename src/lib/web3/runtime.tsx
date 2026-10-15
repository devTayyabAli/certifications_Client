"use client";

// Everything wallet-related (Reown AppKit, wagmi, WalletConnect): about 1.5 MB
// of JavaScript plus calls to Coinbase / WalletConnect / Reown on start-up.
// Never imported directly by the app shell: it loads on demand through
// `loadWeb3()` or <Web3Boundary>, i.e. only on the wallet step, when claiming
// on-chain, or when a learner opens the wallet modal.
import type { ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { base, baseSepolia, sepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { OptionsController } from "@reown/appkit-controllers";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { disconnect, reconnect, watchAccount } from "wagmi/actions";
import { BASE_CHAIN_ID, walletStore } from "@/lib/wallet-store";

const queryClient = new QueryClient();

export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WEB3_PROJECT_ID ||
  "ae64d2d938316ce3350fea4c10f6cc79";

export const metadata = {
  name: "Si Her DeFi",
  description: "DeFi, taught by the people leading it.",
  url: typeof window !== "undefined" ? window.location.origin : "https://siherdefi.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Base is the primary network; the testnets let learners claim badges from a
// test deployment of the badges contract
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [base, sepolia, baseSepolia];

export const wagmiAdapter = new WagmiAdapter({ projectId, networks });

// Wallet Explorer IDs for Reown AppKit featured list
export const ONE_INCH_WALLET_ID = "c286eebc742a537cd1d6818363e9dc53b21759a1e8e5d9b263d0c03ec7703576";
export const TRUST_WALLET_ID = "4622a2b276ced14d16d48270e964bc510e590a79040e6c69f0076a5890f87e09";
export const featuredWalletIds = [TRUST_WALLET_ID, ONE_INCH_WALLET_ID];

const appKit = createAppKit({
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
  },
});

// Email and social logins stay off even if the remote Reown cloud config enables them
OptionsController.setFeaturedWalletIds(featuredWalletIds);
const sanitizeFeatures = () => {
  const current = OptionsController.state.remoteFeatures;
  if (current && (current.email !== false || (Array.isArray(current.socials) && current.socials.length > 0))) {
    OptionsController.setRemoteFeatures({ ...current, email: false, socials: false });
  }
};
sanitizeFeatures();
OptionsController.subscribeKey("remoteFeatures", sanitizeFeatures);

const config = wagmiAdapter.wagmiConfig;

// The connected account goes into the remembered wallet, for every page to show
watchAccount(config, {
  onChange(account) {
    if (account.status !== "connected" || !account.address) return;
    const chainId = account.chainId ? `0x${account.chainId.toString(16)}` : BASE_CHAIN_ID;
    const current = walletStore.get();
    if (!current || current.address.toLowerCase() !== account.address.toLowerCase() || current.chainId !== chainId) {
      walletStore.set({ address: account.address, chainId });
    }
  },
});

// Restore a wallet connected on an earlier visit (WagmiProvider below doesn't,
// so this runs once however many boundaries mount)
void reconnect(config).catch(() => {});

/** Opens the AppKit "connect a wallet" modal. */
export function openWalletModal() {
  return appKit.open();
}

/** Ends the wallet connection (the remembered wallet is cleared by the caller). */
export async function disconnectWallet() {
  try {
    await disconnect(config);
  } catch {
    // already disconnected
  }
}

/** The providers wallet hooks (useAccount, useSignMessage…) need. */
export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
