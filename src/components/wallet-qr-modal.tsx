"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAppKit } from "@reown/appkit/react";

interface WalletQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletName?: string;
  walletIcon?: React.ReactNode;
  installUrl?: string;
  iosUrl?: string;
  androidUrl?: string;
  wcUri?: string;
}

export function QrCodeDisplay({
  value,
  size = 180,
  logoSrc,
}: {
  value: string;
  size?: number;
  logoSrc?: string;
}) {
  const [svgHtml, setSvgHtml] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((svg) => {
        if (isMounted) setSvgHtml(svg);
      })
      .catch((err) => {
        console.error("Failed to generate QR code", err);
      });
    return () => {
      isMounted = false;
    };
  }, [value]);

  return (
    <div
      className="relative p-3 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center overflow-hidden"
      style={{ width: size + 24, height: size + 24 }}
    >
      {svgHtml ? (
        <div
          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      ) : (
        <div className="flex items-center justify-center size-full text-gray-400">
          <svg className="size-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Optional center logo overlay */}
      {logoSrc && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="size-10 rounded-xl bg-white p-1 shadow-md border border-gray-100 flex items-center justify-center overflow-hidden">
            <div className="size-full rounded-lg bg-black flex items-center justify-center p-0.5">
              <svg viewBox="0 0 40 40" className="size-full" fill="none">
                <rect width="40" height="40" rx="8" fill="#000000" />
                <path
                  d="M12.9958 30.3368H27.004V27.3877H21.8431V9.6637H18.776C18.658 12.1409 17.9503 12.7602 14.5588 12.7602H12.9958V15.5914H18.1567V27.3877H12.9958V30.3368Z"
                  fill="#ffffff"
                />
                <path d="M28.4786 15.5919V9.66418H25.5295V15.5919H28.4786Z" fill="#ffffff" />
                <path d="M33.6651 15.5919V9.66418H30.716V15.5919H33.6651Z" fill="#ffffff" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WalletQrModal({
  isOpen,
  onClose,
  walletName = "1inch Wallet",
  installUrl = "https://1inch.io/wallet/",
  iosUrl = "https://apps.apple.com/us/app/1inch-defi-wallet/id1546049391",
  androidUrl = "https://play.google.com/store/apps/details?id=io.oneinch.android",
  wcUri,
}: WalletQrModalProps) {
  const { open: openAppKit } = useAppKit();
  const [tab, setTab] = useState<"connect" | "install">("connect");
  const [copied, setCopied] = useState(false);

  // Generate a fallback WalletConnect URI if not provided
  const [activeWcUri, setActiveWcUri] = useState<string>(
    wcUri || `wc:1inch-${Math.random().toString(36).substring(2, 10)}@2?relay-protocol=irn`
  );

  useEffect(() => {
    if (wcUri) {
      setActiveWcUri(wcUri);
    }
  }, [wcUri]);

  // Handle ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = tab === "connect" ? activeWcUri : installUrl;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[390px] rounded-[28px] bg-[#14151a] border border-[#272834] shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-black flex items-center justify-center border border-white/10 shrink-0 overflow-hidden">
              <svg viewBox="0 0 40 40" className="size-full" fill="none">
                <rect width="40" height="40" rx="8" fill="#000000" />
                <path
                  d="M12.9958 30.3368H27.004V27.3877H21.8431V9.6637H18.776C18.658 12.1409 17.9503 12.7602 14.5588 12.7602H12.9958V15.5914H18.1567V27.3877H12.9958V30.3368Z"
                  fill="#ffffff"
                />
                <path d="M28.4786 15.5919V9.66418H25.5295V15.5919H28.4786Z" fill="#ffffff" />
                <path d="M33.6651 15.5919V9.66418H30.716V15.5919H33.6651Z" fill="#ffffff" />
              </svg>
            </div>
            <h2
              id="wallet-qr-modal-title"
              className="text-[15.5px] font-semibold tracking-tight text-white select-none"
            >
              {walletName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-lg text-[#9ca3af] hover:text-white hover:bg-white/10 transition cursor-pointer"
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

        {/* Tab switch: Scan to Connect vs Scan to Install */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-2 p-1 bg-[#1d1e26] rounded-xl border border-white/[0.05]">
            <button
              type="button"
              onClick={() => setTab("connect")}
              className={`py-2 text-[12.5px] font-semibold rounded-lg transition cursor-pointer ${
                tab === "connect"
                  ? "bg-[#292a38] text-white shadow-sm"
                  : "text-[#9ca3af] hover:text-white"
              }`}
            >
              Scan to Connect
            </button>
            <button
              type="button"
              onClick={() => setTab("install")}
              className={`py-2 text-[12.5px] font-semibold rounded-lg transition cursor-pointer ${
                tab === "install"
                  ? "bg-[#292a38] text-white shadow-sm"
                  : "text-[#9ca3af] hover:text-white"
              }`}
            >
              Scan to Install
            </button>
          </div>
        </div>

        {/* Modal content */}
        <div className="p-5 flex flex-col items-center text-center space-y-4">
          {tab === "connect" ? (
            <>
              <div>
                <p className="text-[13px] text-gray-300 font-medium">
                  Scan with your 1inch Wallet mobile app
                </p>
                <p className="text-[11.5px] text-[#8e8ea6] mt-0.5">
                  Open 1inch app → tap the QR scan icon (top right)
                </p>
              </div>

              {/* QR Code */}
              <QrCodeDisplay value={activeWcUri} size={180} logoSrc="1inch" />

              {/* Action buttons */}
              <div className="w-full flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#232430] hover:bg-[#2c2e3d] text-[13px] font-semibold text-white border border-white/[0.06] transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 20 20" className="size-4 text-emerald-400" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Copied connection link!</span>
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
                    onClose();
                    openAppKit();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6d25d6]/20 hover:bg-[#6d25d6]/30 text-[12.5px] font-semibold text-[#c084fc] border border-[#6d25d6]/30 transition cursor-pointer"
                >
                  <span>Open in Reown AppKit</span>
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[13px] text-gray-300 font-medium">
                  Scan with camera to install 1inch
                </p>
                <p className="text-[11.5px] text-[#8e8ea6] mt-0.5">
                  Point any phone camera to download from official stores
                </p>
              </div>

              {/* QR Code */}
              <QrCodeDisplay value={installUrl} size={180} logoSrc="1inch" />

              {/* Store Links */}
              <div className="w-full grid grid-cols-2 gap-2 pt-1">
                <a
                  href={iosUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#232430] hover:bg-[#2c2e3d] text-[12px] font-semibold text-white border border-white/[0.06] transition"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.67-.97 1.74-.83 2.76 1 .08 2.05-.51 2.56-1.26z" />
                  </svg>
                  <span>App Store ↗</span>
                </a>

                <a
                  href={androidUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#232430] hover:bg-[#2c2e3d] text-[12px] font-semibold text-white border border-white/[0.06] transition"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a2.38 2.38 0 0 1-.22-.963V2.777c0-.356.08-.686.22-.963zM15.207 13.414l2.457 2.458-12.793 7.387 10.336-9.845zm0-2.828L4.871.741l12.793 7.387-2.457 2.458zm1.414 1.414l3.774 2.179c1.07.618 1.07 1.625 0 2.243l-3.774 2.179-2.121-2.121 2.121-2.48z" />
                  </svg>
                  <span>Google Play ↗</span>
                </a>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#101116] border-t border-white/[0.05] flex items-center justify-between text-[11px] text-[#717182]">
          <span>{walletName}</span>
          <a
            href={installUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9ca3af] hover:text-white transition flex items-center gap-1"
          >
            Official Website ↗
          </a>
        </div>
      </div>
    </div>
  );
}
