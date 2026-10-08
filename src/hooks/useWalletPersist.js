/**
 * useWalletPersist — Persist wallet connection across page reloads.
 *
 * Saves the connected wallet address to localStorage whenever it changes.
 * On mount, reads the saved address so the app can show the correct wallet
 * immediately while wagmi's autoConnect is still running (~500ms).
 *
 * This prevents the flash of "wallet disconnected" state that triggers
 * the wallet-mismatch redirect in UserLayout.
 */
import { useEffect } from "react";
import { useAccount } from "wagmi";

const WALLET_KEY = "bw_last_wallet";

export const useWalletPersist = () => {
    const { address, status } = useAccount();

    // Save address whenever it changes
    useEffect(() => {
        if (address) {
            try {
                localStorage.setItem(WALLET_KEY, address.toLowerCase());
            } catch {
                // ignore
            }
        }
    }, [address]);

    // Clear saved address when explicitly disconnected (not during reconnect)
    useEffect(() => {
        if (status === "disconnected") {
            // Only clear if wagmi has fully settled — not during the reconnect phase
            const timer = setTimeout(() => {
                try {
                    localStorage.removeItem(WALLET_KEY);
                } catch {
                    // ignore
                }
            }, 3000); // 3s grace — if autoConnect succeeds, address will be set again
            return () => clearTimeout(timer);
        }
    }, [status]);

    /**
     * Returns the last known wallet address from localStorage.
     * Useful for showing the wallet address immediately on mount
     * before wagmi's autoConnect completes.
     */
    const getLastWallet = () => {
        try {
            return localStorage.getItem(WALLET_KEY) || null;
        } catch {
            return null;
        }
    };

    return { getLastWallet };
};
