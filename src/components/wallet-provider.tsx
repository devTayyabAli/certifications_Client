"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import {
  createPersistentStore,
  usePersistentValue,
} from "@/lib/persistent-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "siherdefi_wallet";
const BASE_CHAIN_ID = "0x2105";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectedWallet = {
  address: string;
  chainId: string;
};

/** Anything without an address is treated as "not connected". */
const walletStore = createPersistentStore<ConnectedWallet | null>(
  STORAGE_KEY,
  null,
  (parsed) => {
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Partial<ConnectedWallet>;
    return candidate.address
      ? { address: candidate.address, chainId: candidate.chainId ?? "" }
      : null;
  },
);

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
  const { address: wagmiAddress, chainId: wagmiChainId, isConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { open: openAppKitModal } = useAppKit();

  // Sync Wagmi / AppKit connected account into the persistent walletStore
  useEffect(() => {
    if (isConnected && wagmiAddress) {
      const hexChain = wagmiChainId ? `0x${wagmiChainId.toString(16)}` : BASE_CHAIN_ID;
      const current = walletStore.get();
      if (!current || current.address.toLowerCase() !== wagmiAddress.toLowerCase() || current.chainId !== hexChain) {
        walletStore.set({
          address: wagmiAddress,
          chainId: hexChain,
        });
      }
    }
  }, [isConnected, wagmiAddress, wagmiChainId]);

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
    try {
      wagmiDisconnect();
    } catch {
      // ignore
    }
  }, [wagmiDisconnect]);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const openAppKit = useCallback(() => {
    openAppKitModal();
  }, [openAppKitModal]);

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
