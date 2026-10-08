"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type ConnectedWallet,
  truncateAddress,
  useWallet,
} from "@/components/wallet-provider";
import { useAppKit } from "@reown/appkit/react";
import { toHex } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import WalletQrModal from "@/components/wallet-qr-modal";
import { walletApi, profileApi, isAuthenticated } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

/** Base Mainnet — chain 8453 = 0x2105 */
const BASE_CHAIN_ID = "0x2105";

const BASE_CHAIN_PARAMS = {
  chainId: BASE_CHAIN_ID,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
} as const;

type WalletState =
  | { status: "idle" }
  | { status: "connecting"; wallet: string }
  | { status: "switching_chain" }
  | { status: "connected"; address: string; chainId: string }
  | { status: "error"; message: string };

type WalletOption = {
  id: string;
  name: string;
  icon: React.ReactNode;
  detect?: () => boolean;
  hint?: string;
  downloadUrl?: string;
};

// ---------------------------------------------------------------------------
// Helpers

function getEthereum() {
  if (typeof window === "undefined") return null;
  return (window as { ethereum?: EIP1193Provider }).ethereum ?? null;
}

/** Extensions can inject after first paint, so re-check when they announce. */
function subscribeToEthereum(onChange: () => void) {
  window.addEventListener("ethereum#initialized", onChange);
  window.addEventListener("eip6963:announceProvider", onChange);
  return () => {
    window.removeEventListener("ethereum#initialized", onChange);
    window.removeEventListener("eip6963:announceProvider", onChange);
  };
}

interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRainbow?: boolean;
  isOneInchIOSWallet?: boolean;
  isOneInchAndroidWallet?: boolean;
  isOneInch?: boolean;
  providers?: EIP1193Provider[];
}

/** Human message for a failed connect / sign / link attempt. */
function linkErrorMessage(err: unknown): string {
  const { code, message, shortMessage, data } = (err ?? {}) as {
    code?: number;
    message?: string;
    shortMessage?: string;
    data?: { message?: string };
  };
  // 4001 = EIP-1193 user rejection; wagmi wraps it as UserRejectedRequestError
  if (code === 4001 || /user rejected|denied/i.test(message ?? "")) {
    return "Signature request rejected. Please approve it in your wallet to link it — it's free and doesn't send a transaction.";
  }
  return data?.message || shortMessage || message || "Failed to link wallet with your account.";
}

/** Find a specific provider from window.ethereum or its providers array */
function findProvider(
  predicate: (p: EIP1193Provider) => boolean,
): EIP1193Provider | null {
  const eth = getEthereum();
  if (!eth) return null;
  // Some injectors expose multiple wallets via providers[]
  const list: EIP1193Provider[] = eth.providers ?? [eth];
  return list.find(predicate) ?? null;
}

// ---------------------------------------------------------------------------
// Icon components
// ---------------------------------------------------------------------------

function MetaMaskIcon() {
  return (
    <svg viewBox="0 0 40 40" className="size-8" fill="none">
      <rect width="40" height="40" rx="10" fill="#F6F1ED" />
      <g transform="translate(6,6) scale(0.7)">
        <path d="M34.354 3.5L20.688 13.438l2.563-6.05L34.354 3.5z" fill="#E2761B" stroke="#E2761B" strokeWidth=".5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.633 3.5l13.55 10.031-2.437-6.143L5.633 3.5z" fill="#E4761B" stroke="#E4761B" strokeWidth=".5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M29.292 26.594l-3.641 5.578 7.79 2.147 2.236-7.606-6.385-.12zM4.338 26.713l2.222 7.606 7.79-2.147-3.641-5.578-6.37.12z" fill="#E4761B" stroke="#E4761B" strokeWidth=".5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.918 17.556l-2.168 3.279 7.724.342-.28-8.289-5.276 4.668zM26.069 17.556l-5.344-4.762-.174 8.383 7.71-.342-2.192-3.28z" fill="#E4761B" stroke="#E4761B" strokeWidth=".5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14.35 32.172l4.654-2.267-4.008-3.131-.646 5.398zM20.983 29.905l4.654 2.267-.632-5.398-4.022 3.131z" fill="#E4761B" stroke="#E4761B" strokeWidth=".5" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

function CoinbaseIcon() {
  return (
    <svg viewBox="0 0 40 40" className="size-8" fill="none">
      <rect width="40" height="40" rx="10" fill="#0052FF" />
      <circle cx="20" cy="20" r="11" fill="#fff" />
      <rect x="14" y="17" width="12" height="6" rx="3" fill="#0052FF" />
    </svg>
  );
}

function RainbowIcon() {
  return (
    <svg viewBox="0 0 40 40" className="size-8" fill="none">
      <rect width="40" height="40" rx="10" fill="#001E59" />
      <path d="M9 29v-3.2c0-8.2 6.6-14.8 14.8-14.8H29v3.2h-5.2c-6.4 0-11.6 5.2-11.6 11.6V29H9z" fill="#FF4000" />
      <path d="M12.2 29v-3.2c0-6.4 5.2-11.6 11.6-11.6H29v3.2h-5.2c-4.6 0-8.4 3.8-8.4 8.4V29h-3.2z" fill="#FFD400" />
      <path d="M15.4 29v-3.2c0-4.6 3.8-8.4 8.4-8.4H29v3.2h-5.2c-2.9 0-5.2 2.3-5.2 5.2V29h-3.2z" fill="#00DB5E" />
      <path d="M18.6 29v-3.2c0-2.9 2.3-5.2 5.2-5.2H29V29H18.6z" fill="#00AAFF" />
    </svg>
  );
}

function WalletConnectIcon() {
  return (
    <svg viewBox="0 0 40 40" className="size-8" fill="none">
      <rect width="40" height="40" rx="10" fill="#3B99FC" />
      <path
        d="M12.5 17.5c4.14-4.05 10.86-4.05 15 0l.5.49a.52.52 0 0 1 0 .74l-1.71 1.67a.27.27 0 0 1-.38 0l-.69-.67c-2.89-2.82-7.58-2.82-10.47 0l-.74.72a.27.27 0 0 1-.38 0L11.94 18.7a.52.52 0 0 1 0-.74l.56-.46zm18.52 3.45 1.52 1.49a.52.52 0 0 1 0 .74l-6.87 6.71a.54.54 0 0 1-.76 0l-4.87-4.76a.14.14 0 0 0-.19 0l-4.87 4.76a.54.54 0 0 1-.76 0L7.46 23.18a.52.52 0 0 1 0-.74l1.52-1.49a.54.54 0 0 1 .76 0l4.87 4.76a.14.14 0 0 0 .19 0l4.87-4.76a.54.54 0 0 1 .76 0l4.87 4.76a.14.14 0 0 0 .19 0l4.87-4.76a.54.54 0 0 1 .76 0z"
        fill="#fff"
      />
    </svg>
  );
}

function OneInchIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <rect width="40" height="40" rx="10" fill="#000000" />
      <path
        d="M12.9958 30.3368H27.004V27.3877H21.8431V9.6637H18.776C18.658 12.1409 17.9503 12.7602 14.5588 12.7602H12.9958V15.5914H18.1567V27.3877H12.9958V30.3368Z"
        fill="#ffffff"
      />
      <path d="M28.4786 15.5919V9.66418H25.5295V15.5919H28.4786Z" fill="#ffffff" />
      <path d="M33.6651 15.5919V9.66418H30.716V15.5919H33.6651Z" fill="#ffffff" />
    </svg>
  );
}

function BaseChainBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e4ed] bg-[#f9fafc] px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#171730]">
      <span className="size-2 rounded-full bg-[#0052ff]" />
      BASE MAINNET
    </span>
  );
}

function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} animate-spin`} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const emptySubscribe = () => () => {};

export default function ConnectWalletForm() {
  const router = useRouter();
  const { wallet: ctxWallet, saveWallet, disconnect } = useWallet();
  const { open: openAppKit } = useAppKit();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [is1inchQrOpen, setIs1inchQrOpen] = useState(false);
  const [isSyncingBackend, setIsSyncingBackend] = useState(false);
  /** Address the backend has confirmed is linked (lower-cased), if any. */
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);
  /** False until the saved wallet has been read from the backend. */
  const [backendChecked, setBackendChecked] = useState(false);
  /** Address with a signature request in flight — avoids double prompts. */
  const linkingAddress = useRef<string | null>(null);
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  /**
   * Proves the learner controls `address` (signs a one-time nonce from the
   * backend — free, no transaction) and links it to their account.
   */
  const linkWallet = useCallback(
    async (address: string, chainId: string, provider?: EIP1193Provider | null) => {
      const { message } = await walletApi.getNonce();

      let signature: string;
      if (provider) {
        signature = (await provider.request({
          method: "personal_sign",
          params: [toHex(message), address],
        })) as string;
      } else if (
        isWagmiConnected &&
        wagmiAddress?.toLowerCase() === address.toLowerCase()
      ) {
        signature = await signMessageAsync({ message, account: wagmiAddress });
      } else {
        const eth = getEthereum();
        if (!eth) {
          throw new Error("Open your wallet to confirm it's yours, then try again.");
        }
        signature = (await eth.request({
          method: "personal_sign",
          params: [toHex(message), address],
        })) as string;
      }

      await walletApi.connect(address, chainId, signature);
      setLinkedAddress(address.toLowerCase());
    },
    [isWagmiConnected, wagmiAddress, signMessageAsync],
  );

  // Initialise from the global context so returning users see their address
  const [walletState, setWalletState] = useState<WalletState>(() =>
    ctxWallet
      ? { status: "connected", address: ctxWallet.address, chainId: ctxWallet.chainId }
      : { status: "idle" },
  );
  // Provider presence is external, browser-only state. Reading it through
  // useSyncExternalStore keeps the hydration render matching the server
  // (`false`) instead of detecting in an effect and re-rendering.
  const hasEthereum = useSyncExternalStore(
    subscribeToEthereum,
    () => !!getEthereum(),
    () => false,
  );

  // Sync with global wallet context (Wagmi / AppKit / persistent store)
  const effectiveWalletState: WalletState = ctxWallet
    ? { status: "connected", address: ctxWallet.address, chainId: ctxWallet.chainId }
    : walletState.status === "connected"
      ? { status: "idle" }
      : walletState;

  // Protect route and load existing wallet status from MongoDB backend on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    let isMounted = true;
    let redirecting = false;
    async function loadBackendWalletStatus() {
      try {
        setIsSyncingBackend(true);
        // The wallet step comes after the profile step — send learners
        // without a name back there first.
        const profile = await profileApi.getProfile();
        if (!isMounted) return;
        if (!profile?.name?.trim()) {
          redirecting = true;
          router.replace("/profile");
          return;
        }

        const res = await walletApi.getStatus();
        if (!isMounted) return;
        if (res && res.connected && res.address) {
          setLinkedAddress(res.address.toLowerCase());
          const walletData: ConnectedWallet = {
            address: res.address,
            chainId: res.chainId || BASE_CHAIN_ID,
          };
          saveWallet(walletData);
          setWalletState({
            status: "connected",
            address: res.address,
            chainId: res.chainId || BASE_CHAIN_ID,
          });
        }
      } catch (err) {
        console.warn("Could not check wallet status from backend:", err);
      } finally {
        if (isMounted && !redirecting) {
          setIsSyncingBackend(false);
          setBackendChecked(true);
        }
      }
    }

    loadBackendWalletStatus();

    return () => {
      isMounted = false;
    };
  }, [router, saveWallet]);

  // Link wallets connected outside this form (AppKit / WalletConnect, or an
  // account switch in the extension) once we know what the backend has.
  useEffect(() => {
    if (!backendChecked || !ctxWallet?.address) return;
    const address = ctxWallet.address.toLowerCase();
    if (address === linkedAddress || address === linkingAddress.current) return;

    linkingAddress.current = address;
    setIsSyncingBackend(true);
    linkWallet(ctxWallet.address, ctxWallet.chainId || BASE_CHAIN_ID)
      .catch((err: unknown) => {
        console.error("Failed to link wallet with backend:", err);
        setWalletState({ status: "error", message: linkErrorMessage(err) });
        disconnect();
      })
      .finally(() => {
        linkingAddress.current = null;
        setIsSyncingBackend(false);
      });
  }, [
    backendChecked,
    ctxWallet?.address,
    ctxWallet?.chainId,
    linkedAddress,
    linkWallet,
    disconnect,
  ]);

  // Listen for account / chain changes after connection
  useEffect(() => {
    const eth = getEthereum();
    if (!eth || walletState.status !== "connected") return;

    const handleAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[];
      if (list.length === 0) {
        setWalletState({ status: "idle" });
      } else {
        setWalletState((prev) =>
          prev.status === "connected"
            ? { ...prev, address: list[0] }
            : prev,
        );
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      setWalletState((prev) =>
        prev.status === "connected"
          ? { ...prev, chainId: chainId as string }
          : prev,
      );
    };

    eth.request({ method: "eth_chainId" })
      .then((id) => handleChainChanged(id))
      .catch(() => null);

    // EIP-1193 event subscription
    const ethAny = eth as unknown as {
      on: (event: string, cb: (v: unknown) => void) => void;
      removeListener: (event: string, cb: (v: unknown) => void) => void;
    };
    ethAny.on("accountsChanged", handleAccountsChanged);
    ethAny.on("chainChanged", handleChainChanged);
    return () => {
      ethAny.removeListener("accountsChanged", handleAccountsChanged);
      ethAny.removeListener("chainChanged", handleChainChanged);
    };
  }, [walletState.status]);

  const connectWallet = useCallback(
    async (walletName: string, provider: EIP1193Provider | null) => {
      if (!provider) {
        // Fallback: If extension isn't found in window, open AppKit modal which supports this wallet via WalletConnect / QR
        try {
          openAppKit();
          return;
        } catch {
          setWalletState({
            status: "error",
            message: `${walletName} extension not detected. Please install the extension or use WalletConnect.`,
          });
          return;
        }
      }

      setWalletState({ status: "connecting", wallet: walletName });

      try {
        // 1. Request accounts
        const accounts = (await provider.request({
          method: "eth_requestAccounts",
        })) as string[];

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts returned.");
        }

        const address = accounts[0];

        // 2. Check chain
        const chainId = (await provider.request({ method: "eth_chainId" })) as string;

        if (chainId !== BASE_CHAIN_ID) {
          setWalletState({ status: "switching_chain" });
          try {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: BASE_CHAIN_ID }],
            });
          } catch (switchErr: unknown) {
            // Chain not added yet (code 4902) — add it
            if ((switchErr as { code?: number }).code === 4902) {
              await provider.request({
                method: "wallet_addEthereumChain",
                params: [BASE_CHAIN_PARAMS],
              });
            } else {
              throw switchErr;
            }
          }
        }

        const finalChainId = (await provider.request({
          method: "eth_chainId",
        })) as string;

        // 3. Prove ownership with a signature and link it to the account
        setIsSyncingBackend(true);
        linkingAddress.current = address.toLowerCase();
        try {
          await linkWallet(address, finalChainId, provider);
        } catch (linkErr: unknown) {
          disconnect();
          setWalletState({ status: "error", message: linkErrorMessage(linkErr) });
          return;
        } finally {
          linkingAddress.current = null;
          setIsSyncingBackend(false);
        }

        setWalletState({
          status: "connected",
          address,
          chainId: finalChainId,
        });
        // Persist to global context + localStorage
        saveWallet({ address, chainId: finalChainId } satisfies ConnectedWallet);
      } catch (err: unknown) {
        const code = (err as { code?: number }).code;
        const message =
          code === 4001
            ? "Connection rejected. Please approve the request in your wallet."
            : (err as Error).message ?? "Something went wrong. Please try again.";
        setWalletState({ status: "error", message });
      }
    },
    [disconnect, linkWallet, openAppKit, saveWallet],
  );

  const handleDisconnect = async () => {
    setIsSyncingBackend(true);
    try {
      await walletApi.disconnect();
    } catch (err) {
      console.warn("Backend wallet disconnect error:", err);
    } finally {
      setIsSyncingBackend(false);
    }
    setLinkedAddress(null);
    disconnect();
    setWalletState({ status: "idle" });
  };

  // Wallet options
  const walletOptions: WalletOption[] = [
    {
      id: "metamask",
      name: "MetaMask",
      icon: <MetaMaskIcon />,
      detect: () => !!findProvider((p) => !!p.isMetaMask),
      downloadUrl: "https://metamask.io/download/",
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      icon: <CoinbaseIcon />,
      detect: () => !!findProvider((p) => !!p.isCoinbaseWallet),
      downloadUrl: "https://www.coinbase.com/wallet/downloads",
    },
    {
      id: "rainbow",
      name: "Rainbow",
      icon: <RainbowIcon />,
      detect: () => !!findProvider((p) => !!p.isRainbow),
      downloadUrl: "https://rainbow.me/download",
    },
    {
      id: "oneinch",
      name: "1inch Wallet",
      icon: <OneInchIcon />,
      detect: () =>
        !!findProvider(
          (p) =>
            Boolean(p.isOneInch || p.isOneInchIOSWallet || p.isOneInchAndroidWallet),
        ),
      downloadUrl: "https://1inch.io/wallet/",
    },
    {
      id: "walletconnect",
      name: "WalletConnect",
      icon: <WalletConnectIcon />,
      hint: "Scan with your mobile wallet app to connect.",
    },
  ];

  const isConnected = effectiveWalletState.status === "connected";
  const isOnBase =
    isConnected && effectiveWalletState.chainId === BASE_CHAIN_ID;
  const isLinked =
    isConnected && effectiveWalletState.address.toLowerCase() === linkedAddress;

  // ---------------------------------------------------------------------------
  // Connected state
  // ---------------------------------------------------------------------------
  if (isConnected) {
    return (
      <div className="w-full space-y-5">
        {/* Success badge */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
              <path d="m8.5 12.2 2.4 2.4 4.6-5" />
            </svg>
          </span>
          <div>
            <p className="text-[13px] font-bold text-[#171730]">Wallet connected</p>
            <p className="mt-1 font-mono text-[12px] text-[#5f5f7a]">
              {truncateAddress(effectiveWalletState.address)}
            </p>
          </div>
          <BaseChainBadge />
          
          {isLinked ? (
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-100/70 border border-emerald-300/50 rounded-lg px-2.5 py-1">
              <svg viewBox="0 0 16 16" className="size-3.5 text-emerald-600" fill="currentColor">
                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
              Linked to your Si Her account
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-[#ddd6fe] bg-[#f5f3ff] px-2.5 py-1 text-[11px] font-medium text-[#6d25d6]">
              <Spinner className="size-3.5" />
              Sign the message in your wallet to link it
            </div>
          )}

          {!isOnBase && (
            <p className="text-[11.5px] text-amber-600 font-medium">
              ⚠ Switch to Base Mainnet in your wallet to mint your certificate.
            </p>
          )}
        </div>

        {/* Full address row */}
        <div className="rounded-xl border border-[#e4e4ed] bg-[#f9fafc] px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold tracking-wider text-[#8e8ea6] uppercase">
            Address
          </span>
          <span className="font-mono text-[11.5px] text-[#171730] break-all text-right">
            {effectiveWalletState.address}
          </span>
        </div>

        {/* BaseScan link */}
        <a
          href={`https://basescan.org/address/${effectiveWalletState.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-[#e2e2ec] px-4 py-2.5 text-[12.5px] font-semibold text-[#5f5f7a] transition hover:bg-gray-50 hover:text-[#171730]"
        >
          <span className="size-2 rounded-full bg-[#0052ff]" />
          View on BaseScan ↗
        </a>

        {/* Continue CTA — only once the backend has the wallet on record */}
        {isLinked ? (
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#501c9c] via-[#6d25d6] to-[#983cf4] px-4 py-3.5 text-[14.5px] font-semibold text-white shadow-md shadow-purple-950/20 transition hover:brightness-105 active:scale-[0.99]"
          >
            Go to my dashboard
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#501c9c] via-[#6d25d6] to-[#983cf4] px-4 py-3.5 text-[14.5px] font-semibold text-white opacity-50"
          >
            Go to my dashboard
            <span aria-hidden="true">→</span>
          </span>
        )}

        <button
          type="button"
          disabled={isSyncingBackend}
          onClick={handleDisconnect}
          className="w-full text-center text-[11.5px] text-[#8e8ea6] hover:text-[#5f5f7a] transition cursor-pointer disabled:opacity-50"
        >
          {isSyncingBackend ? "Disconnecting…" : "Connect a different wallet"}
        </button>
      </div>
    );
  }


  // ---------------------------------------------------------------------------
  // Idle / connecting / error state
  // ---------------------------------------------------------------------------
  const isBusy =
    walletState.status === "connecting" ||
    walletState.status === "switching_chain";

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold tracking-wider text-[#8e8ea6] uppercase">
          Choose wallet
        </p>
        <BaseChainBadge />
      </div>

      {/* Wallet buttons */}
      <div className="space-y-2.5">
        {walletOptions.map((opt) => {
          const detected = mounted && opt.detect ? opt.detect() : null;
          const connectingThis =
            walletState.status === "connecting" && walletState.wallet === opt.name;
          const switchingChain = walletState.status === "switching_chain";

          // WalletConnect
          if (opt.id === "walletconnect") {
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => openAppKit()}
                className="w-full flex items-center justify-between gap-3.5 rounded-xl border border-[#e4e4ed] bg-white px-4 py-3 hover:border-[#6d25d6] hover:bg-[#fbfaff] transition text-left cursor-pointer group shadow-xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {opt.icon}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-[#171730] group-hover:text-[#6d25d6] transition">
                      {opt.name}
                    </p>
                    <p className="text-[11px] text-[#8e8ea6]">
                      Scan with your mobile wallet app to connect
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[#ede9fe] text-[#6d25d6] border border-[#ddd6fe] px-2.5 py-0.5 text-[10px] font-bold">
                  QR CODE
                </span>
              </button>
            );
          }

          // 1inch Wallet (when not installed as browser extension -> Show QR to connect with mobile app or install)
          if (opt.id === "oneinch" && mounted && detected === false) {
            return (
              <div
                key={opt.id}
                className="w-full rounded-xl border border-[#e4e4ed] bg-white px-4 py-3 hover:border-[#6d25d6] hover:bg-[#fbfaff] transition shadow-xs group"
              >
                <div className="flex items-center justify-between gap-3.5">
                  <button
                    type="button"
                    onClick={() => setIs1inchQrOpen(true)}
                    className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    {opt.icon}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[#171730] group-hover:text-[#6d25d6] transition flex items-center gap-2">
                        <span>{opt.name}</span>
                      </p>
                      <p className="text-[11px] text-[#8e8ea6]">
                        Scan QR with mobile app to connect or install
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIs1inchQrOpen(true)}
                      className="rounded-full bg-[#ede9fe] text-[#6d25d6] hover:bg-[#ddd6fe] border border-[#ddd6fe] px-2.5 py-1 text-[10px] font-bold tracking-wider transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="3" height="3" />
                        <rect x="18" y="18" width="3" height="3" />
                      </svg>
                      <span>QR CODE</span>
                    </button>
                    <a
                      href={opt.downloadUrl ?? "https://1inch.io/wallet/"}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Visit official website"
                      className="p-1 rounded-lg text-[#9ca3af] hover:text-[#171730] hover:bg-gray-100 transition text-[11px]"
                    >
                      ↗
                    </a>
                  </div>
                </div>
              </div>
            );
          }

          // Other wallets not installed (only evaluate after client mount to prevent SSR hydration mismatch)
          if (mounted && detected === false) {
            return (
              <a
                key={opt.id}
                href={opt.downloadUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 rounded-xl border border-dashed border-[#dcdce8] bg-white/70 px-4 py-3 transition hover:border-[#bdbdce] hover:bg-white group"
              >
                {opt.icon}
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-[#5f5f7a] group-hover:text-[#171730] transition">
                    {opt.name}
                  </p>
                  <p className="text-[11px] text-[#9ca3af]">
                    Not installed — click to get it ↗
                  </p>
                </div>
              </a>
            );
          }

          // Installed / available
          return (
            <button
              key={opt.id}
              type="button"
              disabled={isBusy}
              onClick={() => {
                const provider =
                  opt.id === "metamask"
                    ? findProvider((p) => !!p.isMetaMask)
                    : opt.id === "coinbase"
                      ? findProvider((p) => !!p.isCoinbaseWallet)
                      : opt.id === "rainbow"
                        ? findProvider((p) => !!p.isRainbow)
                      : opt.id === "oneinch"
                        ? findProvider(
                            (p) =>
                              Boolean(
                                p.isOneInch ||
                                  p.isOneInchIOSWallet ||
                                  p.isOneInchAndroidWallet,
                              ),
                          )
                        : null;
                connectWallet(opt.name, provider ?? getEthereum());
              }}
              className="flex w-full items-center gap-3.5 rounded-xl border border-[#e4e4ed] bg-white px-4 py-3 text-left transition hover:border-[#7c2ae8]/40 hover:bg-[#faf7ff] hover:shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {opt.icon}
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-[#171730]">{opt.name}</p>
                <p className="text-[11px] text-[#8e8ea6]">
                  {switchingChain
                    ? "Switching to Base…"
                    : connectingThis
                      ? "Approve in your wallet…"
                      : "Ready to connect"}
                </p>
              </div>
              {connectingThis || switchingChain ? (
                <Spinner className="size-4 text-[#7c2ae8]" />
              ) : (
                <svg
                  viewBox="0 0 16 16"
                  className="size-4 text-[#c4c4d4] group-hover:text-[#7c2ae8] transition"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 3l5 5-5 5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {walletState.status === "error" && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-600"
        >
          {walletState.message}
        </div>
      )}

      {/* Switching chain indicator */}
      {walletState.status === "switching_chain" && (
        <div className="flex items-center gap-2 rounded-xl border border-[#e4e4ed] bg-[#f9fafc] px-4 py-3 text-[12.5px] text-[#5f5f7a]">
          <Spinner className="size-3.5 text-[#7c2ae8]" />
          Switching network to Base…
        </div>
      )}

      {/* No wallet installed at all */}
      {!hasEthereum && (
        <p className="text-center text-[11px] leading-relaxed text-[#9ca3af]">
          No wallet extension detected.{" "}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#7c2ae8] underline underline-offset-2"
          >
            Install MetaMask
          </a>{" "}
          to get started.
        </p>
      )}

      {/* 1inch Wallet QR Modal */}
      <WalletQrModal
        isOpen={is1inchQrOpen}
        onClose={() => setIs1inchQrOpen(false)}
        walletName="1inch Wallet"
        installUrl="https://1inch.io/wallet/"
        iosUrl="https://apps.apple.com/us/app/1inch-defi-wallet/id1546049391"
        androidUrl="https://play.google.com/store/apps/details?id=io.oneinch.android"
      />
    </div>
  );
}
