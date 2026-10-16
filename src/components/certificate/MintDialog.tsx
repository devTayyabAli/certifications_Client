'use client';
// Claiming badges (and the certificate, once unlocked) on-chain from the
// learner's own wallet: review → confirm in your wallet → confirming → done.
// The server signs a voucher for what was earned; the wallet sends claim() and
// pays the network fee. The server confirms the transaction on-chain before the
// certificate shows as minted, so this polls GET /certificate until it does.
import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Arrow } from '@/components/ui/Arrow';
import { Check } from '@/components/ui/Check';
import { ApiErrorResponse, certificateApi, type CertificateData } from '@/lib/api';
import { claimErrorMessage, findLearnerProvider, sendClaim } from '@/lib/claim-badges';
import { shortAddress } from '@/lib/format';
import { explorerName } from '@/lib/certificate';

type Step = 'review' | 'wallet' | 'confirming' | 'done' | 'slow' | 'error';

/** how often, and for how long, to check before suggesting to come back later */
const POLL_MS = 3000;
const POLL_FOR_MS = 3 * 60 * 1000;

const Spin = ({ className = 'size-3.5' }: { className?: string }) => (
  <span aria-hidden="true" className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
    <span className="text-[#8e8ea6]">{label}</span>
    <span className="text-right font-medium text-[#171730]">{children}</span>
  </div>
);

const STEPS: { id: Step; label: string }[] = [
  { id: 'wallet', label: 'Confirm in your wallet' },
  { id: 'confirming', label: 'Confirming on-chain' },
  { id: 'done', label: 'In your wallet' },
];

export function MintDialog({
  cert,
  onClose,
  onMinted,
  startNow = false,
}: {
  cert: CertificateData;
  onClose: () => void;
  /** called with the refreshed certificate once the claim is confirmed */
  onMinted: (c: CertificateData) => void;
  /** skip the review step to keep watching a claim already in flight */
  startNow?: boolean;
}) {
  const [step, setStep] = useState<Step>(startNow ? 'confirming' : 'review');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CertificateData | null>(null);
  const [txUrl, setTxUrl] = useState<string | null>(cert.mint?.explorerUrl ?? null);
  const alive = useRef(true);
  const { address: wagmiAddress, connector } = useAccount();

  const network = cert.onChain?.network || 'Base';
  const modules = cert.claimable?.moduleIds.length ?? 0;
  const withCertificate = !!cert.claimable?.capstone;
  const what = withCertificate
    ? modules > 0
      ? `your certificate and ${modules} ${modules === 1 ? 'badge' : 'badges'}`
      : 'your certificate'
    : `${modules} ${modules === 1 ? 'badge' : 'badges'}`;
  const closable = step === 'review' || step === 'done' || step === 'slow' || step === 'error';

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closable, onClose]);

  /** Polls the certificate until the server has confirmed the claim on-chain, it failed, or it's slow. */
  const watch = async (first: CertificateData) => {
    const started = Date.now();
    let c = first;
    while (alive.current) {
      if (c.mint?.explorerUrl) setTxUrl(c.mint.explorerUrl);
      if (!c.mint?.pending) {
        if (c.mint?.error) {
          setError(c.mint.error);
          setStep('error');
        } else {
          setResult(c);
          setStep('done');
          onMinted(c);
        }
        return;
      }
      if (Date.now() - started > POLL_FOR_MS) {
        setStep('slow');
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (!alive.current) return;
      try {
        c = await certificateApi.getCertificate();
      } catch {
        // a dropped request: keep checking
      }
    }
  };

  const claim = async () => {
    setError('');
    setStep('wallet');
    try {
      const voucher = await certificateApi.claimVoucher();
      const provider = await findLearnerProvider(voucher.learner, {
        address: wagmiAddress,
        getProvider: connector ? () => connector.getProvider() : undefined,
      });
      const hash = await sendClaim(provider, voucher);
      if (!alive.current) return;
      setStep('confirming');
      const c = await certificateApi.recordClaim(hash);
      await watch(c);
    } catch (e) {
      if (!alive.current) return;
      // the server's messages already read well; wallet errors are translated
      setError(e instanceof ApiErrorResponse && e.message ? e.message : claimErrorMessage(e));
      setStep('error');
    }
  };

  // reopened while a claim is confirming: just keep watching it
  useEffect(() => {
    if (!startNow) return;
    certificateApi
      .getCertificate()
      .then((c) => watch(c))
      .catch(() => setStep('slow'));
    // runs once on open; watch() keeps reading the latest certificate itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = (
    <ol className="mt-5 space-y-3 text-left">
      {STEPS.map((s, i) => {
        const at = STEPS.findIndex((x) => x.id === step);
        const state = i < at || step === 'done' ? 'done' : i === at ? 'now' : 'todo';
        return (
          <li key={s.id} className="flex items-center gap-3 text-[13.5px]">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full ${
                state === 'done'
                  ? 'bg-[#16a34a] text-white'
                  : state === 'now'
                    ? 'bg-[#f4effe] text-[#7c2ae8]'
                    : 'border border-[#e2e2ec] text-[#b4b4c4]'
              }`}
            >
              {state === 'done' ? (
                <Check className="size-3.5" strokeWidth={2.6} />
              ) : state === 'now' ? (
                <Spin />
              ) : (
                <span className="text-[11px]">{i + 1}</span>
              )}
            </span>
            <span className={state === 'todo' ? 'text-[#a3a3b8]' : 'text-[#171730]'}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );

  const explorerLink = (label: string) =>
    txUrl ? (
      <a
        href={txUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[#e4d6fb] bg-[#f6f0fe] text-[15px] font-medium text-[#7c2ae8] transition hover:bg-[#efe5fd]"
      >
        {label} {explorerName(txUrl)} <Arrow dir="up-right" />
      </a>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171730]/40 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mint-title"
        className="relative w-full max-w-[460px] rounded-3xl border border-[#ececf2] bg-white p-6 sm:p-7"
      >
        {closable && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute -right-3 -top-3 grid size-9 cursor-pointer place-items-center rounded-full border border-[#ececf2] bg-white text-[#5f5f7a] transition hover:bg-[#f8f8fc] hover:text-[#171730]"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}

        {step === 'review' && (
          <>
            <p className="text-[12px] text-[#7c2ae8]">Claim on {network}</p>
            <h2 id="mint-title" className="mt-1 text-[21px] font-medium tracking-tight text-[#171730]">
              {withCertificate ? 'Claim your certificate' : 'Claim your badges'}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[#5f5f7a]">
              {withCertificate ? 'Your certificate and badges become' : 'Your badges become'} soulbound tokens in your
              wallet: permanent, verifiable, and they can’t be transferred.
            </p>
            <div className="mt-4 divide-y divide-[#f0f0f5] rounded-2xl border border-[#ececf2] px-4">
              <Row label="You’ll claim">{what}</Row>
              <Row label="To your wallet">
                <span className="tabular-nums">{shortAddress(cert.walletAddress ?? '')}</span>
              </Row>
              <Row label="Network">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#0052ff]" />
                  {network}
                </span>
              </Row>
              <Row label="Network fee">Paid from your wallet</Row>
            </div>
            <div className="mt-6 space-y-2.5 text-center">
              <Button onClick={claim} showIcon={false}>
                Claim on {network}
              </Button>
              <button type="button" onClick={onClose} className="link-cta text-[12.5px] font-medium text-[#5f5f7a]">
                Not now
              </button>
            </div>
          </>
        )}

        {(step === 'wallet' || step === 'confirming') && (
          <div className="text-center" aria-live="polite">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#f4effe] text-[#7c2ae8]">
              <Spin className="size-6" />
            </span>
            <h2 id="mint-title" className="mt-4 text-[20px] font-medium tracking-tight text-[#171730]">
              {step === 'wallet' ? 'Confirm in your wallet' : `Claiming on ${network}…`}
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-6 text-[#5f5f7a]">
              {step === 'wallet'
                ? `Approve the transaction in your wallet. It may ask to switch to ${network} first.`
                : 'Waiting for the network to confirm it. This usually takes under a minute.'}
            </p>
            {progress}
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]">
              <Check className="size-7" />
            </span>
            <h2 id="mint-title" className="mt-4 text-[21px] font-medium tracking-tight text-[#171730]">
              {result?.status === 'minted' ? `Minted on ${result.onChain?.network || network}` : 'Badges claimed'}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[#5f5f7a]">
              {result?.status === 'minted'
                ? 'Your Si Her DeFi certificate is in your wallet. Share it, add it to LinkedIn, or verify it any time.'
                : 'Your badges are in your wallet. Your certificate can be claimed the same way once it unlocks.'}
            </p>
            <div className="mt-6 space-y-2.5">
              <Button onClick={onClose} showIcon={false}>
                {result?.status === 'minted' ? 'View your certificate' : 'Done'}
              </Button>
              {explorerLink('View on')}
            </div>
          </div>
        )}

        {step === 'slow' && (
          <div className="text-center">
            <h2 id="mint-title" className="text-[20px] font-medium tracking-tight text-[#171730]">
              Still confirming
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[#5f5f7a]">
              The network is slower than usual. Your claim is on its way; you can close this and this page will
              update once it’s confirmed.
            </p>
            <div className="mt-6 space-y-2.5">
              {explorerLink('Track it on')}
              <Button onClick={onClose} showIcon={false}>
                Close
              </Button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center">
            <h2 id="mint-title" className="text-[20px] font-medium tracking-tight text-[#171730]">
              Couldn’t complete the claim
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[#5f5f7a]">
              {error || 'Something went wrong. Nothing was claimed; you can try again.'}
            </p>
            <div className="mt-6 space-y-2.5">
              <Button onClick={claim} showIcon={false}>
                Try again
              </Button>
              <button type="button" onClick={onClose} className="link-cta text-[12.5px] font-medium text-[#5f5f7a]">
                Not now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
