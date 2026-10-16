"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { BASE_CHAIN_ID, walletStore, type ConnectedWallet } from "@/lib/wallet-store";
import { usePersistentValue } from "@/lib/persistent-store";
import { hasStoredWalletSession, isWeb3Loaded, loadWeb3 } from "@/lib/web3/load";

export type { ConnectedWallet };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WalletContextValue = {
  wallet: ConnectedWallet | null;
  /** Call after successful provider connection to persist & broadcast */
  saveWallet: (w: ConnectedWallet | null) => void;
  /** Disconnect / forget the wallet */
  disconnect: () => void;
  isOnBase: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  openAppKit: () => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalletContext = createContext<WalletContextValue>({
  wallet: null,
  saveWallet: () => {},
  disconnect: () => {},
  isOnBase: false,
  isModalOpen: false,
  openModal: () => {},
  closeModal: () => {},
  openAppKit: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WalletProvider({ children }: { children: ReactNode }) {
  // Read during render — no hydration flash, and writes from any tab or
  // component re-render every consumer.
  const wallet = usePersistentValue(walletStore);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // The connected AppKit / wagmi account is copied into walletStore by the
  // wallet libraries themselves (lib/web3/runtime), once they have loaded

  // Keep in sync when the browser extension's account or chain changes in the background
  useEffect(() => {
    if (!wallet) return;

    const eth = (
      window as {
        ethereum?: {
          on: (e: string, cb: (...a: unknown[]) => void) => void;
          removeListener: (e: string, cb: (...a: unknown[]) => void) => void;
        };
      }
    ).ethereum;
    if (!eth) return;

    const handleAccounts = (accounts: unknown) => {
      const [next] = accounts as string[];
      if (!next) {
        walletStore.clear();
        return;
      }
      const current = walletStore.get();
      if (current) walletStore.set({ ...current, address: next });
    };

    const handleChain = (chainId: unknown) => {
      const current = walletStore.get();
      if (current) walletStore.set({ ...current, chainId: chainId as string });
    };

    eth.on("accountsChanged", handleAccounts);
    eth.on("chainChanged", handleChain);
    return () => {
      eth.removeListener("accountsChanged", handleAccounts);
      eth.removeListener("chainChanged", handleChain);
    };
  }, [wallet]);

  const saveWallet = useCallback((w: ConnectedWallet | null) => {
    if (w) walletStore.set(w);
    else walletStore.clear();
  }, []);

  const disconnect = useCallback(() => {
    walletStore.clear();
    // End the wallet session too, loading the wallet libraries only when there is one
    if (isWeb3Loaded() || hasStoredWalletSession()) {
      loadWeb3()
        .then((m) => m.disconnectWallet())
        .catch(() => {});
    }
  }, []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Loads the wallet libraries on first use, then opens the AppKit modal
  const openAppKit = useCallback(() => {
    loadWeb3()
      .then((m) => m.openWalletModal())
      .catch(() => {});
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        saveWallet,
        disconnect,
        isOnBase: wallet?.chainId === BASE_CHAIN_ID,
        isModalOpen,
        openModal,
        closeModal,
        openAppKit,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWallet() {
  return useContext(WalletContext);
}

// ---------------------------------------------------------------------------
// Helpers (reusable across components)
// ---------------------------------------------------------------------------

export function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
