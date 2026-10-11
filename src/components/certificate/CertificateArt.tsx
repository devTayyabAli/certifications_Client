'use client';
// The certificate card. `preview` = locked state with the PREVIEW stamp.
import { forwardRef } from 'react';
import { assetPath } from '@/lib/constants';
import type { CertificateData } from '@/lib/api';
import { Arrow } from '@/components/ui/Arrow';

const TOTAL = 12;

export const CertificateArt = forwardRef<HTMLDivElement, { cert: CertificateData; preview: boolean; weekTitles?: Record<number, string> }>(function CertificateArt({ cert, preview, weekTitles = {} }, ref) {
  const c = cert.content;
  const byWeek = new Map(cert.badges.map((b) => [b.week, b]));
  const issued = cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : `After the Week ${cert.unlockModule?.week ?? 1} quiz`;
  const minted = cert.status === 'minted' && cert.onChain?.explorerUrl;
  return (
    <div ref={ref} className="relative overflow-hidden rounded-3xl border border-[#ececf2] bg-white p-7 sm:p-10 shadow-md">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5b1ea6] via-[#7526dd] to-[#a855f7]" />
      {preview && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-12 rounded-xl border-2 border-[#ddd6fe] px-6 py-2 text-[22px] font-medium text-[#ddd6fe]">Preview</span>
        </div>
      )}
      <div className={`mx-auto max-w-[540px] space-y-5 text-center pt-2 ${preview ? 'opacity-60' : ''}`}>
        <div className="mx-auto flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="size-[62px] object-contain drop-shadow-[0_6px_14px_rgba(124,42,232,0.3)]" src={assetPath('/Badge_earned.png')} />
        </div>
        <p className="text-[11px] font-medium text-[#8e8ea6]">Certificate of completion</p>
        <h2 className="text-[28px] sm:text-[34px] font-medium tracking-tight text-[#171730] break-words">{cert.recipientName}</h2>
        <p className="mx-auto max-w-[460px] text-[12px] leading-relaxed text-[#5f5f7a]">{c.statement}</p>
        <div className="pt-1">
          <p className="text-[15px] font-medium text-[#171730]">{c.programName}</p>
          <p className="mt-1 text-[11px] font-medium text-[#8e8ea6]">{c.cohortLabel} · {c.cohortDates} · Powered by Base</p>
        </div>
        <div className="relative flex items-center justify-center pt-3">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#ececf2]" /></div>
          <span className="relative bg-white px-3 text-[11px] font-medium text-[#8e8ea6]">Module badges earned · {cert.badges.length} of {cert.totalBadges || TOTAL}</span>
        </div>
        <div className="mx-auto flex max-w-[460px] flex-wrap items-center justify-center gap-2 sm:gap-3 py-1">
          {Array.from({ length: cert.totalBadges || TOTAL }, (_, i) => i + 1).map((w) => {
            const b = byWeek.get(w);
            return b ? (
              <div key={w} className="relative size-[38px] sm:size-[46px] drop-shadow-xs" title={`Week ${w}: ${weekTitles[w] ?? b.moduleTitle ?? ''} — ${b.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={b.name} className="size-full object-contain" src={b.image} />
              </div>
            ) : (
              <div key={w} className="relative grid size-[38px] sm:size-[46px] place-items-center" title={`Week ${w} — not earned yet`}>
                <svg viewBox="0 0 100 115" className="absolute inset-0 size-full"><polygon points="50 3, 97 29, 97 86, 50 112, 3 86, 3 29" fill="none" stroke="#d8d8e5" strokeWidth="3" strokeDasharray="7 6" /></svg>
                <span className="relative text-[10px] font-medium text-[#c4c4d4]">{String(w).padStart(2, '0')}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-0 rounded-xl border border-[#ececf2] bg-[#f9fafc] p-3 text-center text-[10px]">
          <div className="space-y-0.5 sm:border-r sm:border-[#ececf2]/80">
            <p className="font-medium text-[#8e8ea6] text-[11px]">Issued</p>
            <p className="font-medium text-[#171730]">{issued}</p>
          </div>
          <div className="space-y-0.5 sm:border-r sm:border-[#ececf2]/80">
            <p className="font-medium text-[#8e8ea6] text-[11px]">Credential ID</p>
            <p className="tabular-nums text-[10px] text-[#171730]">{cert.verificationCode ?? '—'}</p>
          </div>
          <div className="space-y-0.5">
            <p className="font-medium text-[#8e8ea6] text-[11px]">{minted ? 'On-chain' : 'Network'}</p>
            {minted ? (
              <a href={cert.onChain.explorerUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 font-medium text-[#7c2ae8] link-cta">
                <span className="size-1.5 rounded-full bg-[#0052ff]" />Token #{cert.onChain.tokenId} <Arrow dir="up-right" />
              </a>
            ) : (
              <p className="inline-flex items-center justify-center gap-1 font-medium text-[#171730]"><span className="size-1.5 rounded-full bg-[#0052ff]" />{cert.onChain?.network || 'Base'}</p>
            )}
          </div>
        </div>
        {!preview && cert.verificationCode && (
          <p className="text-[10.5px] text-[#8e8ea6] break-all">
            Verify at <a href={assetPath(`/credential/${cert.verificationCode}`)} className="font-medium text-[#7c2ae8] hover:text-[#5e3295]">certifications.si3.space/siherdefi/credential/{cert.verificationCode}</a>
          </p>
        )}
        <div className="flex items-center justify-between gap-4 pt-5 text-left border-t border-[#f0f0f5]">
          <div>
            <p className="text-[11px] font-medium text-[#8e8ea6]">Issued by</p>
            <p className="text-[13px] font-medium text-[#171730]">{c.issuerName}</p>
            <p className="text-[9.5px] text-[#8e8ea6]">{c.issuerTagline}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-[#8e8ea6]">Presented by</p>
            <p className="text-[13px] font-medium text-[#171730]">{c.presenterName}</p>
            <p className="text-[9.5px] text-[#8e8ea6]">{c.presenterTagline}</p>
          </div>
        </div>
      </div>
    </div>
  );
});
