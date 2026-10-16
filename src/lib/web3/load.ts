"use client";

// Loads the wallet libraries on demand (see ./runtime). One shared promise, so
// the code downloads and AppKit initialises once.
type Web3Runtime = typeof import("./runtime");

let runtime: Promise<Web3Runtime> | null = null;

export function loadWeb3(): Promise<Web3Runtime> {
  runtime ??= import("./runtime");
  return runtime;
}

export const isWeb3Loaded = () => runtime !== null;

/**
 * Whether this browser has a wallet session stored by wagmi / WalletConnect /
 * AppKit from an earlier visit, so disconnecting must load the libraries to
 * end it (otherwise they would quietly reconnect it later).
 */
export function hasStoredWalletSession(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i) ?? "";
      if (key.startsWith("wagmi.") || key.startsWith("wc@2") || key.startsWith("@appkit")) return true;
    }
  } catch {
    // storage unavailable
  }
  return false;
}
