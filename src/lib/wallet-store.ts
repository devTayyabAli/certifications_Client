"use client";

// The learner's connected wallet, remembered in localStorage. Kept apart from
// the wallet libraries (AppKit / wagmi), which load only where a wallet is
// actually used, so every other page can still show the address.
import { createPersistentStore } from "@/lib/persistent-store";

export const BASE_CHAIN_ID = "0x2105";

export type ConnectedWallet = {
  address: string;
  chainId: string;
};

/** Anything without an address is treated as "not connected". */
export const walletStore = createPersistentStore<ConnectedWallet | null>(
  "siherdefi_wallet",
  null,
  (parsed) => {
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Partial<ConnectedWallet>;
    return candidate.address
      ? { address: candidate.address, chainId: candidate.chainId ?? "" }
      : null;
  },
);
