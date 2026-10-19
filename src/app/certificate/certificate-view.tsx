'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { CertificateArt } from '@/components/certificate/CertificateArt';
import { BadgeShareButtons } from '@/components/certificate/BadgeShareButtons';
import { assetPath } from '@/lib/constants';
import { Web3Boundary } from '@/components/web3-boundary';
import { explorerName } from '@/lib/certificate';

// The claim dialog uses the wallet libraries: they load when it opens, not with the page
const MintDialog = dynamic(() => import('@/components/certificate/MintDialog').then((m) => m.MintDialog), { ssr: false });
import { Button, ButtonLink } from '@/components/ui/Button';
import { Arrow } from '@/components/ui/Arrow';
import { Check } from '@/components/ui/Check';
import { shortAddress } from '@/lib/format';
import {
  certificateApi,
  modulesApi,
  isAuthenticated,
  type CertificateData,
} from '@/lib/api';
import { certificateMintedStore, moduleCompletedStore } from '@/lib/cohort-progress';

const card = 'rounded-2xl border border-[#ececf2] bg-white p-5 sm:p-6 shadow-2xs space-y-3.5';
const secondary =
  'w-full rounded-xl border border-[#e2e2ec] py-2.5 text-center text-[12.5px] font-medium text-[#171730] transition hover:bg-gray-50 active:scale-[0.99] cursor-pointer block disabled:opacity-50 disabled:cursor-wait';
// greyed out (not "busy") while the cohort isn't complete
const finalCta = `${secondary} disabled:cursor-not-allowed disabled:hover:bg-transparent`;

export default function CertificateView() {
  const router = useRouter();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // the mint dialog: 'new' starts a mint, 'watch' follows one already in flight
  const [minting, setMinting] = useState<'new' | 'watch' | null>(null);
  const autoOpened = useRef(false);
  const art = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setError(false);
    setLoading(true);
    Promise.all([
      certificateApi.getCertificate(),
      modulesApi.getAll().catch(() => []),
    ])
      .then(([c, ms]) => {
        setCert(c);
        setTitles(Object.fromEntries(ms.map((m) => [m.week, m.title])));
        moduleCompletedStore.set(c.status !== 'locked');
        certificateMintedStore.set(c.status === 'minted');
        // ?mint=1 (from Part 2 or the dashboard) opens the mint straight away, once
        if (!autoOpened.current && new URLSearchParams(window.location.search).get('mint') === '1') {
          autoOpened.current = true;
          if (c.mint?.pending) setMinting('watch');
          else if (c.canMint) setMinting('new');
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1060px] rounded-2xl border border-[#ececf2] bg-white p-8 text-center">
          <p className="text-[14px] font-medium text-[#171730]">
            We couldn’t load your certificate.
          </p>
          <div className="mt-3 flex justify-center">
            <Button size="md" showIcon={false} onClick={load}>
              Try again
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (loading || !cert) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1060px] space-y-6 animate-pulse motion-reduce:animate-none" role="status" aria-busy="true" aria-label="Loading your certificate">
          <div className="h-8 w-56 rounded bg-[#ececf2]" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-[560px] rounded-3xl bg-[#ececf2] lg:col-span-8" />
            <div className="h-72 rounded-2xl bg-[#ececf2] lg:col-span-4" />
          </div>
        </div>
      </AppShell>
    );
  }

  const c = cert.content;
  const locked = cert.status === 'locked';
  const minted = cert.status === 'minted';
  // shown (and filling up with badges) all along; claiming, LinkedIn, download and the
  // public link open once every module is done
  const complete = minted || (!locked && cert.allModulesDone === true);
  const left = cert.modulesLeft?.length ?? 0;
  const verifyUrl = cert.verifyUrl ?? '';
  const issued = cert.issuedAt ? new Date(cert.issuedAt) : null;
  const addToProfile = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
    c.credentialName,
  ).replace(/%20/g, '+')}&organizationName=${encodeURIComponent(c.linkedinOrganizationName)}${
    issued
      ? `&issueYear=${issued.getUTCFullYear()}&issueMonth=${issued.getUTCMonth() + 1}`
      : ''
  }&certUrl=${encodeURIComponent(verifyUrl)}&certId=${cert.verificationCode}`;

  const download = async () => {
    if (!art.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const url = await toPng(art.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = `si-her-defi-certificate-${cert.verificationCode}.png`;
      a.click();
      setToast('Certificate downloaded');
    } catch {
      setToast('Couldn’t create the image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const copyLink = async () => {
    if (!verifyUrl) return;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setToast('Verification link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast('Couldn’t copy link');
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1060px] space-y-6">
        {toast && (
          <div
            role="status"
            className="fixed top-5 right-5 z-60 rounded-xl bg-[#171730] px-4 py-2.5 text-[12.5px] font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-3"
          >
            {toast}
          </div>
        )}

        <Link
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8e8ea6] hover:text-[#7c2ae8] transition-colors"
          href="/dashboard"
        >
          <Arrow dir="left" /> Back to dashboard
        </Link>

        <div>
          <h1 className="text-[26px] sm:text-[28px] font-medium tracking-tight text-[#171730]">
            {c.pageTitle || 'Your Achievements'}
          </h1>
          <p className="mt-1 text-[13px] text-[#5f5f7a]">
            {c.pageSubtitle || [c.cohortLabel, c.cohortDates, c.programName].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="space-y-3 lg:col-span-8">
            <div className="flex items-center gap-2">
              {locked ? (
                <>
                  <span className="rounded bg-[#f4effe] px-2.5 py-0.5 text-[11px] font-medium text-[#7c2ae8]">
                    Preview
                  </span>
                  <span className="text-[11.5px] text-[#8e8ea6]">
                    Unlocks once you pass the quiz below
                  </span>
                </>
              ) : (
                <>
                  <span className="rounded bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 text-[11px] font-medium text-[#16a34a]">
                    {minted ? `Minted on ${cert.onChain?.network || 'Base'}` : 'Earned'}
                  </span>
                  <span className="text-[11.5px] text-[#8e8ea6]">
                    Updates as you pass more modules
                  </span>
                </>
              )}
            </div>
            <CertificateArt ref={art} cert={cert} preview={locked} weekTitles={titles} />
          </div>

          <div className="space-y-5 lg:col-span-4">
            {/* Share each module badge: the cohort's viral loop, so it's open from the first badge */}
            <div className={card}>
              <span className="text-[11px] font-medium text-[#7c2ae8]">Share your progress</span>
              <h3 className="text-[16px] font-medium text-[#171730]">
                {cert.badges.length} of {cert.totalBadges} badges earned
              </h3>
              {cert.badges.length === 0 ? (
                <p className="text-[12px] leading-relaxed text-[#5f5f7a]">
                  Pass a module quiz to earn your first badge, then share it here.
                  {(cert.stillOpen?.[0] ?? cert.unlockModule) && (
                    <>
                      {' '}
                      <Link
                        href={`/module/${(cert.stillOpen?.[0] ?? cert.unlockModule)!.slug}`}
                        className="font-medium text-[#7c2ae8] link-cta"
                      >
                        Go to {(cert.stillOpen?.[0] ?? cert.unlockModule)!.title}
                      </Link>
                    </>
                  )}
                </p>
              ) : (
                <>
                  <ul className="space-y-2.5">
                    {cert.badges.map((b) => (
                      <li key={`${b.week}-${b.name}`} className="rounded-xl border border-[#ececf2] bg-[#fbfbfd] p-3">
                        {/* the badge opens the session it was earned in */}
                        <Link
                          href={b.moduleSlug ? `/module/${b.moduleSlug}` : '/dashboard'}
                          className="group flex items-center gap-3"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={assetPath(b.image)} alt="" className="size-11 shrink-0 object-contain transition group-hover:-translate-y-0.5" />
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-medium leading-snug text-[#171730] group-hover:text-[#7c2ae8]">{b.name}</p>
                            {b.moduleTitle && (
                              <p className="text-[11px] leading-snug text-[#8e8ea6]">{b.moduleTitle}</p>
                            )}
                          </div>
                        </Link>
                        <div className="mt-2.5">
                          <BadgeShareButtons badge={b} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10.5px] leading-relaxed text-[#8e8ea6]">
                    Each post is written for you and tags the session’s partners. You can edit it before posting.
                  </p>
                </>
              )}
            </div>

            <div className={card}>
              <span className="text-[11px] font-medium text-[#7c2ae8]">On {cert.onChain?.network || 'Base'}</span>
              {minted && cert.onChain ? (
                <>
                  <h3 className="text-[15px] font-medium text-[#171730]">
                    Your certificate is on-chain
                  </h3>
                  <div className="rounded-xl border border-[#ececf2] bg-[#f9fafc] p-3 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8e8ea6] font-medium text-[11px]">Token</span>
                      <span className="tabular-nums font-medium text-[#171730]">
                        #{cert.onChain.tokenId}
                      </span>
                    </div>
                    {cert.onChain.txHash && (
                      <div className="flex items-center justify-between border-t border-[#ececf2]/70 pt-1.5">
                        <span className="text-[#8e8ea6] font-medium text-[11px]">Transaction</span>
                        <span className="tabular-nums text-[#171730]">
                          {shortAddress(cert.onChain.txHash)}
                        </span>
                      </div>
                    )}
                  </div>
                  {cert.onChain.explorerUrl && (
                    <a
                      href={cert.onChain.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${secondary} inline-flex items-center justify-center gap-1.5`}
                    >
                      <span>View on {explorerName(cert.onChain.explorerUrl)}</span>
                      <Arrow dir="up-right" />
                    </a>
                  )}
                </>
              ) : cert.onChain?.enabled && cert.mint?.pending ? (
                <>
                  <h3 className="text-[15px] font-medium text-[#171730]">Claiming…</h3>
                  <p className="text-[12px] leading-relaxed text-[#5f5f7a]">
                    Your claim was sent to {cert.onChain.network} and is waiting to be confirmed. This page updates
                    once it’s in your wallet.
                  </p>
                  <Button showIcon={false} onClick={() => setMinting('watch')}>
                    View progress
                  </Button>
                </>
              ) : cert.onChain?.enabled && complete ? (
                <>
                  <h3 className="text-[15px] font-medium text-[#171730]">Claim your certificate</h3>
                  <p className="text-[12px] leading-relaxed text-[#5f5f7a]">
                    Your certificate and badges go to your wallet on {cert.onChain.network} as soulbound tokens:
                    permanent and verifiable. You confirm the claim in your wallet and pay the network fee.
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-[#ececf2] bg-[#f9fafc] px-3 py-2 text-[11px]">
                    <span className="text-[#8e8ea6] font-medium text-[11px]">Claims to</span>
                    {cert.walletAddress ? (
                      <span className="tabular-nums text-[#171730]">{shortAddress(cert.walletAddress)}</span>
                    ) : (
                      <Link href="/wallet" className="font-medium text-[#7c2ae8] link-cta">
                        Connect a wallet
                      </Link>
                    )}
                  </div>
                  {cert.mint?.error && (
                    <p role="alert" className="text-[11.5px] leading-relaxed text-red-500">
                      Last attempt didn’t go through: {cert.mint.error}
                    </p>
                  )}
                  <Button disabled={!cert.canMint} showIcon={false} onClick={() => setMinting('new')}>
                    Claim on {cert.onChain.network}
                  </Button>
                  {cert.claimable && !cert.claimable.capstone && cert.claimable.moduleIds.length === 0 && (
                    <p className="text-[11px] text-[#8e8ea6]">Everything you’ve earned is already in your wallet.</p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-[15px] font-medium text-[#171730]">Claim certificate upon cohort completion</h3>
                  <p className="text-[12px] leading-relaxed text-[#5f5f7a]">
                    Your certificate and badges will go to your wallet as soulbound tokens: permanent and
                    verifiable. You will be able to claim these at the end of the cohort.
                  </p>
                  {!complete && left > 0 && (
                    <p className="text-[11.5px] text-[#8e8ea6]">
                      {left} {left === 1 ? 'module' : 'modules'} to go.
                    </p>
                  )}
                  <div className="flex items-center justify-between rounded-xl border border-[#ececf2] bg-[#f9fafc] px-3 py-2 text-[11px]">
                    <span className="text-[#8e8ea6] font-medium text-[11px]">Claims to</span>
                    {cert.walletAddress ? (
                      <span className="tabular-nums text-[#171730]">
                        {shortAddress(cert.walletAddress)}
                      </span>
                    ) : (
                      <Link href="/wallet" className="font-medium text-[#7c2ae8] link-cta">
                        Connect a wallet
                      </Link>
                    )}
                  </div>
                  <Button disabled showIcon={false}>
                    Claim certificate
                  </Button>
                </>
              )}

              {/* the finished certificate: everything here opens at the end of the cohort */}
              <div className="space-y-2 border-t border-[#f0f0f5] pt-3.5">
                {complete ? (
                  <ButtonLink href={addToProfile} external showIcon={false}>
                    Add Certificate to LinkedIn <Arrow dir="up-right" />
                  </ButtonLink>
                ) : (
                  <Button disabled showIcon={false}>
                    Add Certificate to LinkedIn
                  </Button>
                )}
                <button type="button" disabled={!complete || downloading} onClick={download} className={finalCta}>
                  {downloading ? 'Preparing image…' : 'Download certificate'}
                </button>
                <button type="button" disabled={!complete} onClick={copyLink} className={finalCta}>
                  {copied ? (
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      Link copied <Check className="size-4" />
                    </span>
                  ) : (
                    'Copy certificate link'
                  )}
                </button>
                {complete && verifyUrl ? (
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${finalCta} inline-flex items-center justify-center gap-1.5`}
                  >
                    <span>View public certificate</span>
                    <Arrow dir="up-right" />
                  </a>
                ) : (
                  <button type="button" disabled className={finalCta}>
                    View public certificate
                  </button>
                )}
                <p className="text-[10.5px] leading-relaxed text-[#8e8ea6]">
                  {complete
                    ? 'The certificate link opens a public page where anyone, such as an employer, can check your certificate is real.'
                    : 'Available once you complete the cohort.'}
                </p>
              </div>
            </div>

            {cert.stillOpen && cert.stillOpen.length > 0 && (
              <div className="rounded-2xl border border-[#ececf2] bg-white p-5 shadow-2xs space-y-3.5">
                <h3 className="text-[11.5px] font-medium text-[#8e8ea6]">Still open</h3>
                <div className="space-y-3 divide-y divide-[#f0f0f5]">
                  {cert.stillOpen.map((s) => (
                    <div key={s.slug} className="pt-3 first:pt-0 space-y-1">
                      <h4 className="text-[13px] font-medium text-[#171730]">{s.title}</h4>
                      <Link
                        className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#7c2ae8] link-cta"
                        href={`/module/${s.slug}`}
                      >
                        <span>Take the quiz</span>
                        <Arrow dir="right" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {minting && (
        <Web3Boundary
          fallback={
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-xs" aria-busy="true" aria-label="Opening your wallet">
              <div className="size-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          }
        >
          <MintDialog
            cert={cert}
            startNow={minting === 'watch'}
            onClose={() => {
              setMinting(null);
              load();
            }}
            onMinted={(c) => {
              setCert(c);
              certificateMintedStore.set(true);
            }}
          />
        </Web3Boundary>
      )}
    </AppShell>
  );
}
