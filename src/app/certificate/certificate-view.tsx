"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import CertificateSheet from "@/components/certificate-sheet";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { truncateAddress } from "@/components/wallet-provider";
import { certificateApi, isAuthenticated, type CertificateData } from "@/lib/api";
import {
  downloadCertificatePng,
  linkedInAddToProfileUrl,
  linkedInShareUrl,
} from "@/lib/certificate";
import { certificateMintedStore, moduleCompletedStore } from "@/lib/cohort-progress";
import { modulePath } from "@/lib/modules";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; cert: CertificateData };

function Card({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#ececf2] bg-white p-5 sm:p-6 shadow-2xs space-y-3.5">
      {label && <span className="text-[10px] font-bold tracking-wider text-[#7c2ae8] uppercase">{label}</span>}
      {children}
    </div>
  );
}

const primaryBtn =
  "w-full rounded-xl bg-gradient-to-r from-[#5b1ea6] via-[#7526dd] to-[#8a33ea] py-2.5 text-center text-[12.5px] font-semibold text-white shadow-md shadow-purple-950/20 transition hover:brightness-105 active:scale-[0.99] cursor-pointer block";
const softBtn =
  "w-full rounded-xl bg-[#f4effe] py-2.5 text-center text-[12.5px] font-semibold text-[#7c2ae8] transition hover:bg-[#ede5fc] active:scale-[0.99] cursor-pointer block";
const outlineBtn =
  "w-full rounded-xl border border-[#e2e2ec] py-2.5 text-center text-[12.5px] font-semibold text-[#171730] transition hover:bg-gray-50 active:scale-[0.99] cursor-pointer block disabled:opacity-50 disabled:cursor-wait";

export default function CertificateView() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    certificateApi
      .getCertificate()
      .then((cert) => {
        if (cancelled) return;
        setLoad({ status: "ready", cert });
        // Keep the sidebar / dashboard in step with the server
        moduleCompletedStore.set(cert.status !== "locked");
        certificateMintedStore.set(cert.status === "minted");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoad({
          status: "error",
          message: err instanceof Error && err.message ? err.message : "We couldn’t load your certificate.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [router, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const frame = (children: ReactNode) => (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8f8fc] font-sans antialiased text-[#171730]">
      {toast && (
        <div
          role="status"
          className="fixed top-5 right-5 z-60 rounded-xl bg-[#171730] px-4 py-2.5 text-[12.5px] font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-3"
        >
          {toast}
        </div>
      )}
      <DashboardSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 sm:py-8 overflow-y-auto">
        <div className="mx-auto max-w-[1060px] space-y-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#8e8ea6] uppercase hover:text-[#7c2ae8] transition-colors"
          >
            ← Back to dashboard
          </Link>
          {children}
        </div>
      </main>
    </div>
  );

  if (load.status === "loading") {
    return frame(
      <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading certificate">
        <div className="h-8 w-56 rounded bg-[#ececf2]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-[560px] rounded-3xl bg-[#ececf2] lg:col-span-8" />
          <div className="h-72 rounded-2xl bg-[#ececf2] lg:col-span-4" />
        </div>
      </div>,
    );
  }

  if (load.status === "error") {
    return frame(
      <div className="rounded-2xl border border-[#ececf2] bg-white p-8 text-center shadow-xs">
        <p className="text-[14px] font-semibold text-[#171730]">{load.message}</p>
        <button
          type="button"
          onClick={() => {
            setLoad({ status: "loading" });
            setReloadKey((k) => k + 1);
          }}
          className="mt-4 rounded-full bg-[#171730] px-5 py-2 text-[12.5px] font-bold text-white hover:bg-black cursor-pointer"
        >
          Try again
        </button>
      </div>,
    );
  }

  const { cert } = load;
  const { content } = cert;
  const isLocked = cert.status === "locked";
  const isMinted = cert.status === "minted";
  const hasName = !!cert.recipientName.trim();
  const ready = !isLocked && !!cert.verifyUrl && !!cert.verificationCode;

  const copyLink = async () => {
    if (!cert.verifyUrl) return;
    try {
      await navigator.clipboard.writeText(cert.verifyUrl);
      setToast("Verification link copied");
    } catch {
      setToast("Couldn’t copy — the link is shown under your certificate");
    }
  };

  const download = async () => {
    if (!cert.verifyUrl || !cert.verificationCode) return;
    setDownloading(true);
    try {
      await downloadCertificatePng({
        recipientName: cert.recipientName,
        content,
        badges: cert.badges,
        totalBadges: cert.totalBadges,
        issuedAt: cert.issuedAt,
        verificationCode: cert.verificationCode,
        verifyUrl: cert.verifyUrl,
        network: cert.onChain.network,
      });
    } catch {
      setToast("Couldn’t create the image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return frame(
    <>
      <div>
        <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-[#171730]">Your certificate</h1>
        <p className="mt-1 text-[13px] text-[#5f5f7a]">
          {content.cohortLabel} · {content.cohortDates} · {content.programName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Certificate */}
        <div className="space-y-3 lg:col-span-8">
          <div className="flex items-center gap-2">
            {isMinted ? (
              <span className="rounded bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[#16a34a] uppercase">
                Minted on {cert.onChain.network}
              </span>
            ) : isLocked ? (
              <span className="rounded bg-[#f4effe] px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[#7c2ae8] uppercase">
                Preview
              </span>
            ) : (
              <span className="rounded bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[#16a34a] uppercase">
                Earned
              </span>
            )}
            <span className="text-[11.5px] text-[#8e8ea6]">
              {isLocked ? "Unlocks once you pass the quiz below" : "Updates as you pass more modules"}
            </span>
          </div>

          <CertificateSheet
            recipientName={cert.recipientName}
            content={content}
            badges={cert.badges}
            totalBadges={cert.totalBadges}
            issuedAt={cert.issuedAt}
            verificationCode={cert.verificationCode}
            verifyUrl={cert.verifyUrl}
            onChain={cert.onChain}
            preview={isLocked}
          />
        </div>

        {/* Actions */}
        <div className="space-y-5 lg:col-span-4">
          {isLocked ? (
            <Card label="Locked">
              <h3 className="text-[16px] font-bold text-[#171730]">Unlock your certificate</h3>
              <p className="text-[12px] leading-relaxed text-[#5f5f7a]">
                {cert.unlockModule
                  ? `Pass the Week ${cert.unlockModule.week} quiz — ${cert.unlockModule.title} — to unlock it.`
                  : "It unlocks once you pass the certificate module’s quiz."}
              </p>
              {cert.unlockModule && (
                <Link href={modulePath(cert.unlockModule)} className={primaryBtn}>
                  Go to Week {cert.unlockModule.week} →
                </Link>
              )}
            </Card>
          ) : (
            <Card label={isMinted ? "Minted" : "Ready to share"}>
              <h3 className="text-[16px] font-bold text-[#171730]">
                {cert.badges.length} of {cert.totalBadges} badges earned
              </h3>
              {!hasName && (
                <p className="rounded-xl bg-[#fffbeb] p-3 text-[11.5px] text-[#92400e]">
                  Your certificate has no name yet.{" "}
                  <Link href="/profile?from=dashboard" className="font-semibold underline">
                    Add it in your profile
                  </Link>
                  .
                </p>
              )}
              {ready && (
                <div className="space-y-2 pt-1">
                  <a
                    href={linkedInAddToProfileUrl({
                      content,
                      issuedAt: cert.issuedAt,
                      verifyUrl: cert.verifyUrl!,
                      verificationCode: cert.verificationCode!,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={primaryBtn}
                  >
                    Add to LinkedIn profile ↗
                  </a>
                  <a
                    href={linkedInShareUrl(cert.verifyUrl!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={softBtn}
                  >
                    Share on LinkedIn ↗
                  </a>
                  <button type="button" onClick={download} disabled={downloading} className={outlineBtn}>
                    {downloading ? "Preparing image…" : "Download image"}
                  </button>
                  <button type="button" onClick={copyLink} className={outlineBtn}>
                    Copy verification link
                  </button>
                  <a href={cert.verifyUrl!} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
                    View public page ↗
                  </a>
                </div>
              )}
              <p className="text-[10.5px] text-[#8e8ea6] leading-relaxed">
                “Add to profile” puts it under Licenses &amp; certifications; sharing posts it to your feed.
              </p>
            </Card>
          )}

          {/* On-chain */}
          <Card label="On Base">
            {isMinted ? (
              <>
                <h3 className="text-[15px] font-bold text-[#171730]">Your certificate is on-chain</h3>
                <div className="rounded-xl border border-[#ececf2] bg-[#f9fafc] p-3 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8e8ea6] font-semibold uppercase text-[9px] tracking-wider">Token</span>
                    <span className="font-mono font-bold text-[#171730]">#{cert.onChain.tokenId}</span>
                  </div>
                  {cert.onChain.txHash && (
                    <div className="flex items-center justify-between border-t border-[#ececf2]/70 pt-1.5">
                      <span className="text-[#8e8ea6] font-semibold uppercase text-[9px] tracking-wider">
                        Transaction
                      </span>
                      <span className="font-mono text-[#171730]">{truncateAddress(cert.onChain.txHash)}</span>
                    </div>
                  )}
                </div>
                {cert.onChain.explorerUrl && (
                  <a href={cert.onChain.explorerUrl} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
                    View on BaseScan ↗
                  </a>
                )}
              </>
            ) : (
              <>
                <h3 className="text-[15px] font-bold text-[#171730]">Minting opens soon</h3>
                <p className="text-[12px] leading-relaxed text-[#5f5f7a]">
                  Your certificate will be written to {cert.onChain.network} as a soulbound token in your wallet —
                  permanent, and gas is covered by Si Her DAO. We’ll let you know when minting opens.
                </p>
                <div className="flex items-center justify-between rounded-xl border border-[#ececf2] bg-[#f9fafc] px-3 py-2 text-[11px]">
                  <span className="text-[#8e8ea6] font-semibold uppercase text-[9px] tracking-wider">Mints to</span>
                  {cert.walletAddress ? (
                    <span className="font-mono text-[#171730]">{truncateAddress(cert.walletAddress)}</span>
                  ) : (
                    <Link href="/wallet" className="font-semibold text-[#7c2ae8] hover:underline">
                      Connect a wallet
                    </Link>
                  )}
                </div>
                <button type="button" disabled className={`${outlineBtn} disabled:cursor-not-allowed`}>
                  Mint on {cert.onChain.network} — coming soon
                </button>
              </>
            )}
          </Card>

          {cert.stillOpen.length > 0 && (
            <div className="rounded-2xl border border-[#ececf2] bg-white p-5 shadow-2xs space-y-3.5">
              <h3 className="text-[10.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">Still open</h3>
              <div className="space-y-3 divide-y divide-[#f0f0f5]">
                {cert.stillOpen.map((m) => (
                  <div key={m.slug} className="pt-3 first:pt-0 space-y-1">
                    <p className="text-[9.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">
                      Week {String(m.week).padStart(2, "0")}
                    </p>
                    <h4 className="text-[13px] font-bold text-[#171730]">{m.title}</h4>
                    <Link
                      href={modulePath(m)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#7c2ae8] hover:underline"
                    >
                      Take the quiz →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
  );
}
