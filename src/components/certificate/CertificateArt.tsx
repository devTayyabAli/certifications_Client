'use client';
// The Si Her DeFi certificate (design "1a — Certificate · Light", 2000×2000).
// The static artwork is public/v2/certificate-base.svg (the design file with the name, badges and
// on-chain values taken out); those three are drawn on top so they're live: the member's name,
// the badge art for every module they passed, and the contract / token / verify details.
// Everything is positioned in the design's own 2000-unit grid (as % of the square) and sized
// with container units, so it scales with the card and downloads as the same image.
import { forwardRef } from 'react';
import { assetPath } from '@/lib/constants';
import { shortAddress } from '@/lib/format';
import type { Certificate } from '@/lib/types';

const pct = (n: number) => `${(n / 2000) * 100}%`;
const cq = (n: number) => `${(n / 2000) * 100}cqw`;
/** The design's 33-unit value text, smaller when it wouldn't fit its column (≈0.6 units of width per unit of size per character). */
const fitSize = (text: string, width: number) => Math.min(33, width / Math.max(1, text.length * 0.6));
/** The network as the design shows it: one short word ("BASE", "SEPOLIA"). */
const shortNetwork = (name?: string) => {
  const n = (name || 'Base').toLowerCase();
  if (n.includes('base') && n.includes('sepolia')) return 'BASE SEPOLIA';
  if (n.includes('sepolia')) return 'SEPOLIA';
  return 'BASE';
};
const badgePosition = (index: number, count: number) => {
  const firstRow = Math.min(count, 7);
  const row = index < firstRow ? 0 : 1;
  const rowCount = row === 0 ? firstRow : count - firstRow;
  const column = row === 0 ? index : index - firstRow;
  // Preserve the design's 190-unit spacing, centering each occupied row.
  return { x: 1000 - (rowCount * 150 + (rowCount - 1) * 40) / 2 + column * 190, y: row === 0 ? 1104 : 1298 };
};

export const CertificateArt = forwardRef<HTMLDivElement, { cert: Certificate | any; preview: boolean; weekTitles?: Record<number, string> }>(function CertificateArt({ cert, preview, weekTitles = {} }, ref) {
  const earnedBadges = [...(cert.badges ?? [])].sort((a, b) => (a.week ?? 0) - (b.week ?? 0)).slice(0, 12);
  const name = cert.recipientName || 'Your name';
  // shrink long names so they stay on one line inside the 1250-unit text column
  const nameSize = Math.min(140, 1250 / Math.max(1, name.length * 0.56));
  const minted = cert.status === 'minted';
  const network = shortNetwork(cert.onChain?.network);
  // values come from the certificate's real on-chain data; each column is a
  // fixed width in the design's box, so long values are set a little smaller
  const info = [
    { x: 527, width: 250, label: 'CONTRACT', text: cert.onChain?.contractAddress ? shortAddress(cert.onChain.contractAddress) : 'At mint' },
    { x: 795, width: 180, label: 'TOKEN ID', text: minted && cert.onChain?.tokenId ? `#${String(cert.onChain.tokenId).padStart(4, '0')}` : '—' },
    { x: 989, width: 165, label: 'NETWORK', text: network, dot: true },
    { x: 1168, width: 320, label: 'VERIFY', text: cert.verificationCode || 'After it unlocks' },
  ];

  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-2xl bg-[#FCFBFF] shadow-md [container-type:inline-size]" style={{ aspectRatio: '1 / 1' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assetPath('/v2/certificate-base.svg')} alt="" className="absolute inset-0 size-full select-none" draggable={false} />

      <div className={`absolute inset-0 ${preview ? 'opacity-60' : ''}`}>
        {/* name */}
        <p className="absolute inset-x-0 text-center font-medium leading-none tracking-[-0.025em] text-[#14122B] whitespace-nowrap" style={{ top: pct(378), fontSize: cq(nameSize) }}>{name}</p>

        {/* Only earned badges, in module order, with each occupied row centered. */}
        {earnedBadges.map((b, i) => {
          const s = badgePosition(i, earnedBadges.length);
          const title = (b.week != null ? weekTitles[b.week] : '') ?? b.moduleTitle ?? b.name ?? '';
          return (
            <div key={b.week ?? b.id ?? i} className="absolute grid place-items-center" style={{ left: pct(s.x), top: pct(s.y), width: pct(150), height: pct(173) }}
              title={`${title} · ${b.name}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetPath(b.image)} alt={b.name} className="size-full object-contain drop-shadow-[0_6px_10px_rgba(94,50,149,0.25)]" />
            </div>
          );
        })}

        {/* on-chain details inside the design's box */}
        {info.map((c) => (
          <div key={c.label} className="absolute" style={{ left: pct(c.x), top: pct(1601) }}>
            <p className="font-medium leading-none tracking-[0.12em] text-[#8179A8]" style={{ fontSize: cq(23) }}>{c.label}</p>
            <p className="inline-flex items-center whitespace-nowrap font-medium leading-none tabular-nums text-[#14122B]" style={{ fontSize: cq(fitSize(c.text, c.width - (c.dot ? 36 : 0))), marginTop: cq(22), gap: cq(14) }}>
              {c.dot && <span className="rounded-full bg-[#0052ff]" style={{ width: cq(22), height: cq(22) }} />}
              {c.text}
            </p>
          </div>
        ))}
      </div>

      {preview && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-12 rounded-xl border-2 border-[#ddd6fe] bg-white/70 px-6 py-2 text-[22px] font-medium text-[#b9a6e8]">Preview</span>
        </div>
      )}
    </div>
  );
});
