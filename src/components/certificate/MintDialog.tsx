'use client';
// Minting the certificate on-chain: review → sending → confirming → minted.
// The server's minter wallet sends the transactions (gas covered by Si Her DAO;
// the learner signs nothing). The certificate only shows as minted once the
// chain confirms it, so this polls GET /certificate until it does.
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Arrow } from '@/components/ui/Arrow';
import { Check } from '@/components/ui/Check';
import { certificateApi, type CertificateData } from '@/lib/api';
import { shortAddress } from '@/lib/format';

type Step = 'review' | 'sending' | 'confirming' | 'done' | 'slow' | 'error';

/** how often, and for how long, to check the chain before suggesting to come back later */
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

/** "View on Etherscan" / "View on BaseScan", from where the link points */
export function explorerName(url?: string | null) {
  if (!url) return 'the block explorer';
  if (/basescan/i.test(url)) return 'BaseScan';
  if (/etherscan/i.test(url)) return 'Etherscan';
  return 'the block explorer';
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'sending', label: 'Sending to the network' },
  { id: 'confirming', label: 'Confirming on-chain' },
  { id: 'done', label: 'Minted' },
];

export function MintDialog({
  cert,
  onClose,
  onMinted,
  startNow = false,
}: {
  cert: CertificateData;
  onClose: () => void;
  onMinted: (c: CertificateData) => void;
  /** skip the review step, e.g. to keep watching a mint that's already in flight */
  startNow?: boolean;
}) {
  const [step, setStep] = useState<Step>(startNow ? 'confirming' : 'review');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CertificateData | null>(null);
  const alive = useRef(true);
  const network = cert.onChain?.network || 'Base';
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

  /** Polls the certificate until the chain confirms the mint, it fails, or it's taking too long. */
  const watch = async (first?: CertificateData) => {
    const started = Date.now();
    let c = first ?? (await certificateApi.getCertificate());
    while (alive.current) {
      if (c.status === 'minted') {
        setResult(c);
        setStep('done');
        onMinted(c);
        return;
      }
      if (c.mint?.error) {
        setError(c.mint.error);
        setStep('error');
        return;
      }
      if (Date.now() - started > POLL_FOR_MS) {
        setResult(c);
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

  const mint = async () => {
    setError('');
    setStep('sending');
    try {
      const c = await certificateApi.mint();
      if (!alive.current) return;
      setStep('confirming');
      await watch(c);
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Nothing was charged; you can try again.');
      setStep('error');
    }
  };

  // reopening while a mint is already in flight: just keep watching it
  useEffect(() => {
    if (!startNow) return;
    certificateApi
      .getCertificate()
      .then((c) => watch(c))
      .catch(() => setStep('slow'));
    // runs once on open; watch() reads the latest certificate itself
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

  const txUrl = result?.onChain?.explorerUrl ?? result?.mint?.explorerUrl ?? null;

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
            <p className="text-[12px] text-[#7c2ae8]">Mint on {network}</p>
            <h2 id="mint-title" className="mt-1 text-[21px] font-medium tracking-tight text-[#171730]">
              Mint your certificate
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[#5f5f7a]">
              Your certificate and module badges become soulbound tokens in your wallet: permanent, verifiable,
              and they can’t be transferred.
            </p>
            <div className="mt-4 divide-y divide-[#f0f0f5] rounded-2xl border border-[#ececf2] px-4">
              <Row label="Certificate">{cert.content?.credentialName ?? 'Si Her DeFi certificate'}</Row>
              <Row label="Badges">
                {cert.badges?.length ?? 0} of {cert.totalBadges}
              </Row>
              <Row label="Mints to">
                <span className="tabular-nums">{shortAddress(cert.walletAddress ?? '')}</span>
              </Row>
              <Row label="Network">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#0052ff]" />
                  {network}
                </span>
              </Row>
              <Row label="Gas fee">
                <span className="text-[#16a34a]">Covered by Si Her DAO</span>
              </Row>
            </div>
            <div className="mt-6 space-y-2.5 text-center">
              <Button onClick={mint} showIcon={false}>
                Mint on {network}
              </Button>
              <button type="button" onClick={onClose} className="link-cta text-[12.5px] font-medium text-[#5f5f7a]">
                Not now
              </button>
            </div>
          </>
        )}

        {(step === 'sending' || step === 'confirming') && (
          <div className="text-center" aria-live="polite">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#f4effe] text-[#7c2ae8]">
              <Spin className="size-6" />
            </span>
            <h2 id="mint-title" className="mt-4 text-[20px] font-medium tracking-tight text-[#171730]">
              Minting on {network}…
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-6 text-[#5f5f7a]">
              {step === 'sending'
                ? 'Sending your certificate to the network. There’s nothing to sign or pay.'
                : 'Waiting for the network to confirm it. This usually takes under a minute.'}
            </p>
            {progress}
          </div>
        )}

        {step === 'done' && result && (
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]">
              <Check className="size-7" />
            </span>
            <h2 id="mint-title" className="mt-4 text-[21px] font-medium tracking-tight text-[#171730]">
              Minted on {result.onChain?.network || network}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[#5f5f7a]">
              Your Si Her DeFi certificate is in your wallet. Share it, add it to LinkedIn, or verify it any time.
            </p>
            <div className="mt-4 divide-y divide-[#f0f0f5] rounded-2xl border border-[#ececf2] px-4 text-left">
              <Row label="Token">
                <span className="tabular-nums">#{result.onChain?.tokenId}</span>
              </Row>
              {result.onChain?.txHash && (
                <Row label="Transaction">
                  <span className="tabular-nums">{shortAddress(result.onChain.txHash)}</span>
                </Row>
              )}
            </div>
            <div className="mt-6 space-y-2.5">
              <Button onClick={onClose} showIcon={false}>
                View your certificate
              </Button>
              {txUrl && (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[#e4d6fb] bg-[#f6f0fe] text-[15px] font-medium text-[#7c2ae8] transition hover:bg-[#efe5fd]"
                >
                  View on {explorerName(txUrl)} <Arrow dir="up-right" />
                </a>
              )}
            </div>
          </div>
        )}

        {step === 'slow' && (
          <div className="text-center">
            <h2 id="mint-title" className="text-[20px] font-medium tracking-tight text-[#171730]">
              Still confirming
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[#5f5f7a]">
              The network is slower than usual. Your mint is on its way; you can close this and your certificate
              will show as minted once it’s confirmed.
            </p>
            <div className="mt-6 space-y-2.5">
              {txUrl && (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[#e4d6fb] bg-[#f6f0fe] text-[15px] font-medium text-[#7c2ae8] transition hover:bg-[#efe5fd]"
                >
                  Track it on {explorerName(txUrl)} <Arrow dir="up-right" />
                </a>
              )}
              <Button onClick={onClose} showIcon={false}>
                Close
              </Button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center">
            <h2 id="mint-title" className="text-[20px] font-medium tracking-tight text-[#171730]">
              Couldn’t mint your certificate
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[#5f5f7a]">
              {error || 'Something went wrong. Nothing was charged; you can try again.'}
            </p>
            <div className="mt-6 space-y-2.5">
              <Button onClick={mint} showIcon={false}>
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
