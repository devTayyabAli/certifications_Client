"use client";

import { useEffect, useState } from "react";
import { useWallet, type ConnectedWallet } from "./wallet-provider";
import { useAppKit } from "@reown/appkit/react";

// ---------------------------------------------------------------------------
// Base Chain Constants
// ---------------------------------------------------------------------------

const BASE_CHAIN_ID = "0x2105";
const BASE_CHAIN_PARAMS = {
  chainId: BASE_CHAIN_ID,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export function WalletConnectIcon({ className = "size-10" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-xl bg-[#3396ff] flex items-center justify-center shrink-0 shadow-sm`}
    >
      <svg viewBox="0 0 40 40" className="size-6" fill="none">
        <path
          d="M12.5 17.5c4.14-4.05 10.86-4.05 15 0l.5.49a.52.52 0 0 1 0 .74l-1.71 1.67a.27.27 0 0 1-.38 0l-.69-.67c-2.89-2.82-7.58-2.82-10.47 0l-.74.72a.27.27 0 0 1-.38 0L11.94 18.7a.52.52 0 0 1 0-.74l.56-.46zm18.52 3.45 1.52 1.49a.52.52 0 0 1 0 .74l-6.87 6.71a.54.54 0 0 1-.76 0l-4.87-4.76a.14.14 0 0 0-.19 0l-4.87 4.76a.54.54 0 0 1-.76 0L7.46 23.18a.52.52 0 0 1 0-.74l1.52-1.49a.54.54 0 0 1 .76 0l4.87 4.76a.14.14 0 0 0 .19 0l4.87-4.76a.54.54 0 0 1 .76 0l4.87 4.76a.14.14 0 0 0 .19 0l4.87-4.76a.54.54 0 0 1 .76 0z"
          fill="#fff"
        />
      </svg>
    </div>
  );
}

export function MetaMaskFoxIcon({ className = "size-10" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-xl flex items-center justify-center shrink-0 overflow-hidden`}
    >
      <svg viewBox="0 0 32 32" className="size-9" fill="none">
        <path d="M29.5 2.5L17.5 11.2l2.3-5.3 9.7-3.4z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.2"/>
        <path d="M2.5 2.5l12 8.7-2.3-5.3L2.5 2.5z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2"/>
        <path d="M25 22.8l-3.2 4.9 6.8 1.9 2-6.7-5.6-.1zM1.4 22.9l2 6.7 6.8-1.9-3.2-4.9-5.6.1z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2"/>
        <path d="M9.8 14.9l-1.9 2.9 6.8.3-.3-7.3-4.6 4.1zM22.2 14.9l-4.6-4.1-.2 7.3 6.7-.3-1.9-2.9z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2"/>
        <path d="M10.2 27.7l4.1-2-3.5-2.8-.6 4.8zM17.7 25.7l4.1 2-.5-4.8-3.6 2.8z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2"/>
        <path d="M21.8 23l-3.8-2.6-2 1.3-2-1.3-3.8 2.6 3.9 3.1 1.9-.9 1.9.9 3.9-3.1z" fill="#F6851B"/>
        <path d="M14 18.5l-2.8-.3 1.9 3.8.9-3.5zM18 18.5l.9 3.5 1.9-3.8-2.8.3z" fill="#393939"/>
        <path d="M12.1 22l1.9-3.8 2 1.4-3.9 2.4zM16 19.6l2-1.4 1.9 3.8-3.9-2.4z" fill="#CD6116"/>
        <path d="M19.9 22l-1.9 3.7.9.7 2.9-2.3-1.9-2.1zM12.1 22l-1.9 2.1 2.9 2.3.9-.7-1.9-3.7z" fill="#F6851B"/>
        <path d="M14 27.7l2 1.6 2-1.6-.9-.7-1.1.5-1.1-.5-.9.7z" fill="#C0AD9E"/>
        <path d="M16 26.9l1.1.5.9-.7-2-1.3-2 1.3.9.7 1.1-.5z" fill="#161616"/>
      </svg>
    </div>
  );
}

export function PhantomIcon({ className = "size-10" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-xl bg-[#ab9ff2] flex items-center justify-center shrink-0 shadow-sm`}
    >
      <svg viewBox="0 0 32 32" className="size-6" fill="none">
        <path
          d="M25.5 16.5c-.26-5.3-4.66-9.5-10-9.5-5.52 0-10 4.46-10 9.97 0 3.41 1.72 6.43 4.34 8.22.35.24.8.04.89-.37l1.01-4.68a1.5 1.5 0 0 1 1.33-1.16h5.96c1 0 1.8.88 1.67 1.87l-.61 4.62c-.08.64.63.98 1.05.62 2.62-.89 4.63-3.44 4.63-6.42"
          fill="#fff"
        />
        <circle cx="18.5" cy="14.5" r="1.3" fill="#ab9ff2" />
        <circle cx="22.5" cy="14.5" r="1.3" fill="#ab9ff2" />
      </svg>
    </div>
  );
}

export function BrowserWalletIcon({ className = "size-10" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-xl bg-[#22232c] flex items-center justify-center shrink-0 border border-white/10 p-1.5`}
    >
      <div className="grid grid-cols-2 gap-1 size-7 place-items-center bg-white/5 rounded-lg p-1">
        {/* Fox */}
        <div className="size-2.5 rounded-[2px] bg-[#e2761b] flex items-center justify-center text-[5px] text-white font-bold">🦊</div>
        {/* 1inch */}
        <div className="size-2.5 rounded-[2px] bg-black flex items-center justify-center text-[4.5px] text-white font-bold font-mono">1&quot;</div>
        {/* Coinbase Blue */}
        <div className="size-2.5 rounded-[2px] bg-[#0052ff] flex items-center justify-center text-[5px] text-white font-bold">●</div>
        {/* Phantom Purple */}
        <div className="size-2.5 rounded-[2px] bg-[#ab9ff2] flex items-center justify-center text-[5px] text-white font-bold">👻</div>
      </div>
    </div>
  );
}

export function OneInchWalletIcon({ className = "size-10" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-xl bg-black flex items-center justify-center shrink-0 border border-white/10 overflow-hidden shadow-xs`}
    >
      <svg viewBox="0 0 40 40" className="size-full" fill="none">
        <rect width="40" height="40" rx="10" fill="#000000" />
        <path
          d="M12.9958 30.3368H27.004V27.3877H21.8431V9.6637H18.776C18.658 12.1409 17.9503 12.7602 14.5588 12.7602H12.9958V15.5914H18.1567V27.3877H12.9958V30.3368Z"
          fill="#ffffff"
        />
        <path d="M28.4786 15.5919V9.66418H25.5295V15.5919H28.4786Z" fill="#ffffff" />
        <path d="M33.6651 15.5919V9.66418H30.716V15.5919H33.6651Z" fill="#ffffff" />
      </svg>
    </div>
  );
}

export function AllWalletsIcon({ className = "size-10" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-xl bg-[#132238] flex items-center justify-center shrink-0 border border-[#38bdf8]/20`}
    >
      <div className="grid grid-cols-2 gap-1.5 size-4 place-items-center">
        <span className="size-1.5 rounded-full bg-[#38bdf8]" />
        <span className="size-1.5 rounded-full bg-[#38bdf8]" />
        <span className="size-1.5 rounded-full bg-[#38bdf8]" />
        <span className="size-1.5 rounded-full bg-[#38bdf8]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider Helper Functions
// ---------------------------------------------------------------------------

/** The slice of the EIP-1193 provider surface this modal actually uses. */
type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isOneInch?: boolean;
  /** Present when several extensions are installed side by side. */
  providers?: Eip1193Provider[];
};

type WalletWindow = Window & {
  ethereum?: Eip1193Provider;
  phantom?: { ethereum?: Eip1193Provider };
  solana?: Eip1193Provider;
};

/** EIP-1193 rejections carry a numeric `code`; 4001 = user rejected. */
function providerErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
}

function providerErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : undefined;
}

function getEthereumProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as WalletWindow).ethereum ?? null;
}

function getMetaMaskProvider(): Eip1193Provider | null {
  const eth = getEthereumProvider();
  if (!eth) return null;
  if (Array.isArray(eth.providers)) {
    return (
      eth.providers.find((p) => p.isMetaMask) ?? eth
    );
  }
  return eth;
}

function getPhantomProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const win = window as WalletWindow;
  return win.phantom?.ethereum ?? win.solana ?? null;
}

import { QrCodeDisplay } from "./wallet-qr-modal";

function getOneInchProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = getEthereumProvider();
  if (!eth) return null;
  if (Array.isArray(eth.providers)) {
    return eth.providers.find((p) => p.isOneInch) ?? null;
  }
  return eth.isOneInch ? eth : null;
}

// ---------------------------------------------------------------------------
// Modal Component
// ---------------------------------------------------------------------------

type ModalView = "list" | "walletconnect" | "all_wallets" | "phantom_info" | "oneinch_qr";

export default function WalletConnectModal() {
  const { isModalOpen } = useWallet();
  // The body only exists while the modal is open, so every open mounts it
  // fresh — that is what resets the view, the in-flight wallet and any error.
  // Cheaper and less error-prone than a reset effect that has to enumerate
  // every piece of state.
  if (!isModalOpen) return null;
  return <WalletConnectModalBody />;
}

function WalletConnectModalBody() {
  const { closeModal, saveWallet } = useWallet();
  const { open: openAppKit } = useAppKit();

  const [currentView, setCurrentView] = useState<ModalView>("list");
  const [oneInchTab, setOneInchTab] = useState<"connect" | "install">("connect");
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal]);

  // ---------------------------------------------------------------------------
  // Connect Handlers
  // ---------------------------------------------------------------------------

  const handleConnectEthereum = async (
    walletName: string,
    customProvider?: Eip1193Provider | null,
  ) => {
    setErrorMsg(null);
    setConnectingWallet(walletName);

    try {
      const provider = customProvider || getEthereumProvider();

      if (!provider) {
        throw new Error(
          `${walletName} extension not found. Please install ${walletName} to connect.`
        );
      }

      // 1. Request accounts
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No account was authorized.");
      }

      // 2. Ensure Base Mainnet
      let chainId = (await provider.request({ method: "eth_chainId" })) as string;

      if (chainId !== BASE_CHAIN_ID) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BASE_CHAIN_ID }],
          });
        } catch (switchErr) {
          // 4902 = chain unknown to the wallet, so add it first.
          if (providerErrorCode(switchErr) === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [BASE_CHAIN_PARAMS],
            });
          } else {
            throw switchErr;
          }
        }
        chainId = (await provider.request({ method: "eth_chainId" })) as string;
      }

      const connected: ConnectedWallet = {
        address: accounts[0],
        chainId: chainId || BASE_CHAIN_ID,
      };

      saveWallet(connected);
      closeModal();
    } catch (err) {
      if (providerErrorCode(err) === 4001) {
        setErrorMsg("Connection request rejected in wallet.");
      } else {
        setErrorMsg(
          providerErrorMessage(err) ?? "Failed to connect. Please try again.",
        );
      }
    } finally {
      setConnectingWallet(null);
    }
  };

  const handleCopyWcUri = () => {
    const fakeUri = `wc:${Math.random().toString(36).substring(2)}@2?relay-protocol=irn&symKey=${Math.random().toString(36).substring(2)}`;
    navigator.clipboard?.writeText(fakeUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Sub-views
  // ---------------------------------------------------------------------------

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-connect-wallet-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className="w-full max-w-[370px] sm:max-w-[390px] rounded-[28px] bg-[#14151a] border border-[#272834] shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          {/* Back button or placeholder */}
          {currentView !== "list" ? (
            <button
              type="button"
              onClick={() => {
                setCurrentView("list");
                setErrorMsg(null);
              }}
              className="p-1 -ml-1.5 rounded-lg text-[#9ca3af] hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Back"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <div className="p-1 -ml-1.5 text-transparent select-none opacity-30">
              <svg viewBox="0 0 24 24" className="size-5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
          )}

          {/* Title */}
          <h2
            id="modal-connect-wallet-title"
            className="text-[16.5px] font-semibold tracking-tight text-white select-none"
          >
            {currentView === "walletconnect"
              ? "WalletConnect"
              : currentView === "all_wallets"
                ? "All Wallets"
                : currentView === "phantom_info"
                  ? "Phantom"
                  : currentView === "oneinch_qr"
                    ? "1inch Wallet"
                    : "Connect Wallet"}
          </h2>

          {/* Close button */}
          <button
            type="button"
            onClick={closeModal}
            className="p-1 -mr-1.5 rounded-lg text-[#9ca3af] hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-4 space-y-2.5">
          {errorMsg && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] leading-snug">
              {errorMsg}
            </div>
          )}

          {/* ════ View: Main List ════ */}
          {currentView === "list" && (
            <div className="space-y-2.5">
              {/* 1. WalletConnect */}
              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openAppKit();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1d1e26] hover:bg-[#252632] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <WalletConnectIcon />
                  <span className="text-[15px] font-semibold text-white group-hover:text-white truncate">
                    WalletConnect
                  </span>
                </div>
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#38bdf8] bg-[#0c2338] border border-[#0284c7]/30 rounded-md">
                  QR CODE
                </span>
              </button>

              {/* 2. MetaMask */}
              <button
                type="button"
                disabled={connectingWallet === "MetaMask"}
                onClick={() => handleConnectEthereum("MetaMask", getMetaMaskProvider())}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1d1e26] hover:bg-[#252632] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer group text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <MetaMaskFoxIcon />
                  <span className="text-[15px] font-semibold text-white group-hover:text-white truncate">
                    MetaMask
                  </span>
                </div>
                {connectingWallet === "MetaMask" && (
                  <span className="size-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                )}
              </button>

              {/* 3. Phantom */}
              <button
                type="button"
                disabled={connectingWallet === "Phantom"}
                onClick={() => {
                  const phantom = getPhantomProvider();
                  if (phantom) {
                    handleConnectEthereum("Phantom", phantom);
                  } else {
                    setCurrentView("phantom_info");
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1d1e26] hover:bg-[#252632] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer group text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <PhantomIcon />
                  <span className="text-[15px] font-semibold text-white group-hover:text-white truncate">
                    Phantom
                  </span>
                </div>
                {connectingWallet === "Phantom" && (
                  <span className="size-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                )}
              </button>

              {/* 4. 1inch Wallet */}
              <button
                type="button"
                disabled={connectingWallet === "1inch Wallet"}
                onClick={() => {
                  const oneInch = getOneInchProvider();
                  if (oneInch) {
                    handleConnectEthereum("1inch Wallet", oneInch);
                  } else {
                    setCurrentView("oneinch_qr");
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1d1e26] hover:bg-[#252632] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer group text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <OneInchWalletIcon />
                  <span className="text-[15px] font-semibold text-white group-hover:text-white truncate">
                    1inch Wallet
                  </span>
                </div>
                {connectingWallet === "1inch Wallet" ? (
                  <span className="size-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                ) : (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#38bdf8] bg-[#0c2338] border border-[#0284c7]/30 rounded-md">
                    QR CODE
                  </span>
                )}
              </button>

              {/* 5. Browser Wallet */}
              <button
                type="button"
                disabled={connectingWallet === "Browser Wallet"}
                onClick={() => handleConnectEthereum("Browser Wallet")}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1d1e26] hover:bg-[#252632] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer group text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <BrowserWalletIcon />
                  <span className="text-[15px] font-semibold text-white group-hover:text-white truncate">
                    Browser Wallet
                  </span>
                </div>
                {connectingWallet === "Browser Wallet" && (
                  <span className="size-4 rounded-full border-2 border-[#38bdf8] border-t-transparent animate-spin" />
                )}
              </button>

              {/* 5. All Wallets */}
              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openAppKit();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1d1e26] hover:bg-[#252632] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <AllWalletsIcon />
                  <span className="text-[15px] font-semibold text-white group-hover:text-white truncate">
                    All Wallets
                  </span>
                </div>
                <span className="shrink-0 px-2 py-0.5 text-[11px] font-semibold text-[#8e8ea6] bg-[#292a36] rounded-md">
                  100+
                </span>
              </button>
            </div>
          )}

          {/* ════ View: WalletConnect QR ════ */}
          {currentView === "walletconnect" && (
            <div className="flex flex-col items-center text-center py-2 px-1 space-y-4">
              <p className="text-[13px] text-[#9ca3af]">
                Scan this QR code with your mobile wallet camera to connect.
              </p>

              {/* QR Code Presentation Box */}
              <div className="relative p-3.5 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                {/* Crisp SVG QR Code */}
                <svg viewBox="0 0 160 160" className="size-44" fill="none">
                  {/* Outer corner squares */}
                  <rect x="10" y="10" width="40" height="40" rx="6" fill="#111827" />
                  <rect x="17" y="17" width="26" height="26" rx="3" fill="#fff" />
                  <rect x="23" y="23" width="14" height="14" rx="2" fill="#111827" />

                  <rect x="110" y="10" width="40" height="40" rx="6" fill="#111827" />
                  <rect x="117" y="17" width="26" height="26" rx="3" fill="#fff" />
                  <rect x="123" y="23" width="14" height="14" rx="2" fill="#111827" />

                  <rect x="10" y="110" width="40" height="40" rx="6" fill="#111827" />
                  <rect x="17" y="117" width="26" height="26" rx="3" fill="#fff" />
                  <rect x="23" y="123" width="14" height="14" rx="2" fill="#111827" />

                  {/* Matrix bits */}
                  <rect x="60" y="12" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="74" y="12" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="88" y="12" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="60" y="28" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="80" y="28" width="16" height="8" rx="2" fill="#111827" />
                  <rect x="18" y="60" width="16" height="8" rx="2" fill="#111827" />
                  <rect x="42" y="60" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="110" y="60" width="16" height="8" rx="2" fill="#111827" />
                  <rect x="134" y="60" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="12" y="74" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="28" y="74" width="16" height="8" rx="2" fill="#111827" />
                  <rect x="118" y="74" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="134" y="74" width="16" height="8" rx="2" fill="#111827" />

                  <rect x="60" y="110" width="14" height="8" rx="2" fill="#111827" />
                  <rect x="82" y="110" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="60" y="124" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="76" y="124" width="14" height="8" rx="2" fill="#111827" />
                  <rect x="60" y="138" width="16" height="8" rx="2" fill="#111827" />
                  <rect x="84" y="138" width="8" height="8" rx="2" fill="#111827" />

                  <rect x="110" y="110" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="126" y="110" width="16" height="8" rx="2" fill="#111827" />
                  <rect x="118" y="124" width="14" height="8" rx="2" fill="#111827" />
                  <rect x="138" y="124" width="8" height="8" rx="2" fill="#111827" />
                  <rect x="110" y="138" width="16" height="8" rx="2" fill="#111827" />
                  <rect x="134" y="138" width="8" height="8" rx="2" fill="#111827" />

                  {/* Center Badge */}
                  <rect x="60" y="60" width="40" height="40" rx="10" fill="#3396ff" />
                  <path
                    d="M68 76c3.2-3.1 8.4-3.1 11.6 0l.4.4.4-.4c3.2-3.1 8.4-3.1 11.6 0l1.2 1.2-5.3 5.2-3.8-3.7-3.8 3.7-5.3-5.2 1.2-1.2h3.5z"
                    fill="#fff"
                  />
                </svg>
              </div>

              {/* Copy action */}
              <button
                type="button"
                onClick={handleCopyWcUri}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#232430] hover:bg-[#2c2e3d] text-[13px] font-medium text-white transition cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <svg viewBox="0 0 20 20" className="size-4 text-emerald-400" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Copied link!</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="size-4 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    <span>Copy to clipboard</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ════ View: All Wallets ════ */}
          {currentView === "all_wallets" && (
            <div className="space-y-2">
              <p className="text-[12px] text-[#9ca3af] px-1">
                Select your preferred web3 wallet:
              </p>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {/* MetaMask */}
                <button
                  type="button"
                  onClick={() => handleConnectEthereum("MetaMask", getMetaMaskProvider())}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1d1e26] hover:bg-[#252632] transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <MetaMaskFoxIcon className="size-8" />
                    <span className="text-[14px] font-medium text-white">MetaMask</span>
                  </div>
                  <span className="text-[11px] text-[#8e8ea6]">Installed</span>
                </button>

                {/* Coinbase Wallet */}
                <button
                  type="button"
                  onClick={() => handleConnectEthereum("Coinbase Wallet")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1d1e26] hover:bg-[#252632] transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-[#0052ff] grid place-items-center">
                      <div className="size-3.5 bg-white rounded-full" />
                    </div>
                    <span className="text-[14px] font-medium text-white">Coinbase Wallet</span>
                  </div>
                </button>

                {/* Phantom */}
                <button
                  type="button"
                  onClick={() => {
                    const phantom = getPhantomProvider();
                    if (phantom) handleConnectEthereum("Phantom", phantom);
                    else setCurrentView("phantom_info");
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1d1e26] hover:bg-[#252632] transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <PhantomIcon className="size-8" />
                    <span className="text-[14px] font-medium text-white">Phantom</span>
                  </div>
                </button>

                {/* Rainbow */}
                <button
                  type="button"
                  onClick={() => handleConnectEthereum("Rainbow")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1d1e26] hover:bg-[#252632] transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-gradient-to-tr from-[#001eff] via-[#00e1ff] to-[#ff2b00] grid place-items-center text-white text-[12px] font-bold">
                      🌈
                    </div>
                    <span className="text-[14px] font-medium text-white">Rainbow</span>
                  </div>
                </button>

                {/* 1inch Wallet */}
                <button
                  type="button"
                  onClick={() => {
                    const oneInch = getOneInchProvider();
                    if (oneInch) {
                      handleConnectEthereum("1inch Wallet", oneInch);
                    } else {
                      setCurrentView("oneinch_qr");
                    }
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1d1e26] hover:bg-[#252632] transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <OneInchWalletIcon className="size-8" />
                    <span className="text-[14px] font-medium text-white">1inch Wallet</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#38bdf8] bg-[#0c2338] border border-[#0284c7]/30 rounded-md">
                    QR CODE
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ════ View: 1inch QR ════ */}
          {currentView === "oneinch_qr" && (
            <div className="flex flex-col items-center text-center py-2 px-1 space-y-4">
              {/* Tab switch */}
              <div className="w-full grid grid-cols-2 p-1 bg-[#1d1e26] rounded-xl border border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => setOneInchTab("connect")}
                  className={`py-1.5 text-[12px] font-semibold rounded-lg transition cursor-pointer ${
                    oneInchTab === "connect"
                      ? "bg-[#292a38] text-white shadow-sm"
                      : "text-[#9ca3af] hover:text-white"
                  }`}
                >
                  Scan to Connect
                </button>
                <button
                  type="button"
                  onClick={() => setOneInchTab("install")}
                  className={`py-1.5 text-[12px] font-semibold rounded-lg transition cursor-pointer ${
                    oneInchTab === "install"
                      ? "bg-[#292a38] text-white shadow-sm"
                      : "text-[#9ca3af] hover:text-white"
                  }`}
                >
                  Scan to Install
                </button>
              </div>

              {oneInchTab === "connect" ? (
                <>
                  <div>
                    <p className="text-[13px] text-gray-200 font-medium">
                      Scan with your 1inch mobile app
                    </p>
                    <p className="text-[11.5px] text-[#9ca3af] mt-0.5">
                      Open 1inch app → tap the QR scan icon (top right)
                    </p>
                  </div>

                  <QrCodeDisplay
                    value="wc:1inch-connect@2?relay-protocol=irn"
                    size={170}
                    logoSrc="1inch"
                  />

                  <div className="w-full flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyWcUri}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#232430] hover:bg-[#2c2e3d] text-[13px] font-semibold text-white transition cursor-pointer border border-white/[0.06]"
                    >
                      {copiedLink ? (
                        <>
                          <svg viewBox="0 0 20 20" className="size-4 text-emerald-400" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Copied link!</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" className="size-4 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                          <span>Copy connection link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        closeModal();
                        openAppKit();
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#6d25d6]/20 hover:bg-[#6d25d6]/30 text-[12px] font-medium text-[#c084fc] border border-[#6d25d6]/30 transition cursor-pointer"
                    >
                      <span>Open in Reown AppKit</span>
                      <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-[13px] text-gray-200 font-medium">
                      Scan with camera to install 1inch
                    </p>
                    <p className="text-[11.5px] text-[#9ca3af] mt-0.5">
                      Point camera to download from official stores
                    </p>
                  </div>

                  <QrCodeDisplay
                    value="https://1inch.io/wallet/"
                    size={170}
                    logoSrc="1inch"
                  />

                  <div className="w-full grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="https://apps.apple.com/us/app/1inch-defi-wallet/id1546049391"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#232430] hover:bg-[#2c2e3d] text-[12px] font-semibold text-white border border-white/[0.06] transition"
                    >
                      App Store ↗
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=io.oneinch.android"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#232430] hover:bg-[#2c2e3d] text-[12px] font-semibold text-white border border-white/[0.06] transition"
                    >
                      Google Play ↗
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════ View: Phantom Info ════ */}
          {currentView === "phantom_info" && (
            <div className="text-center py-4 px-2 space-y-4">
              <div className="size-14 mx-auto rounded-2xl bg-[#ab9ff2] flex items-center justify-center">
                <PhantomIcon className="size-10" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-white">Install Phantom</h3>
                <p className="mt-1 text-[12.5px] text-[#9ca3af] leading-relaxed">
                  Phantom extension was not detected in this browser. Install Phantom to connect on Base and Ethereum.
                </p>
              </div>
              <a
                href="https://phantom.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#ab9ff2] text-black text-[13.5px] font-bold hover:brightness-105 transition"
              >
                Get Phantom ↗
              </a>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3.5 bg-[#101116] border-t border-white/[0.05] flex items-center justify-between text-[11px] text-[#717182]">
          <span>Powered by Web3</span>
          <span className="flex items-center gap-1.5 font-medium text-[#9ca3af]">
            <span className="size-1.5 rounded-full bg-[#0052ff]" />
            Base Network
          </span>
        </div>
      </div>
    </div>
  );
}
