'use client';

// Sharing one module badge: sample copy to customise, the handles to tag
// (only those set in the CMS), the session image to download, and the
// LinkedIn / X composers. The content comes from the server (see badge-share).
import { useEffect, useState } from 'react';
import { Arrow } from '@/components/ui/Arrow';
import { Check } from '@/components/ui/Check';
import type { BadgeShare, CertificateBadge } from '@/lib/api';
import { assetPath } from '@/lib/constants';

const icon = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Copy({ className = 'size-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`inline-block shrink-0 ${className}`} {...icon}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function Download({ className = 'size-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`inline-block shrink-0 ${className}`} {...icon}>
      <path d="M12 4v11m0 0-4-4m4 4 4-4" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

export function BadgeShareButtons({ badge }: { badge: Pick<CertificateBadge, 'name' | 'share'> }) {
  const share: BadgeShare = badge.share ?? { text: '', handles: [], image: null };
  const text = share.text.trim() || `I just earned the "${badge.name}" badge in Si Her DeFi! #SiHerDeFi`;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!copiedKey) return;
    const t = setTimeout(() => setCopiedKey(null), 1800);
    return () => clearTimeout(t);
  }, [copiedKey]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
    } catch {
      /* clipboard blocked: the text is selectable on the page */
    }
  };

  // Saves the session image. Fetching it first gives a real download (and a
  // sensible file name); when the host blocks that, the image opens instead.
  const download = async () => {
    if (!share.image || downloading) return;
    const src = assetPath(share.image);
    setDownloading(true);
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || src.split('.').pop()?.split('?')[0] || 'png';
      const name = `${badge.name.replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-') || 'session'}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  const copyBtn =
    'inline-flex shrink-0 items-center gap-1 rounded-md border border-[#e4e4ee] bg-white px-2 py-1 text-[11px] font-medium text-[#45465f] transition hover:border-[#7c2ae8] hover:text-[#7c2ae8]';

  return (
    <div className="space-y-3">
      {share.image && (
        <div className="overflow-hidden rounded-lg border border-[#ececf2] bg-[#f9fafc]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetPath(share.image)} alt={`${badge.name} session image`} className="aspect-video w-full object-cover" />
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <p className="text-[11px] text-[#8e8ea6]">Session image to post with</p>
            <button type="button" onClick={download} disabled={downloading} className={copyBtn}>
              <Download className="size-3" />
              {downloading ? 'Saving…' : 'Download'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-[#f9fafc] px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8e8ea6]">Customize this copy:</p>
          <button type="button" onClick={() => copy('text', text)} className={copyBtn}>
            {copiedKey === 'text' ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copiedKey === 'text' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="whitespace-pre-wrap break-words text-[12px] leading-5 text-[#45465f]">{text}</p>
      </div>

      {share.handles.length > 0 && (
        <div className="rounded-lg bg-[#f9fafc] px-3 py-2.5">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8e8ea6]">Social handles to tag:</p>
          <ul className="divide-y divide-[#ececf2]">
            {share.handles.map((h, i) => {
              const key = `${h.platform}-${i}`;
              return (
                <li key={key} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0">
                    <p className="text-[11px] leading-snug text-[#8e8ea6]">{h.label}</p>
                    {h.url ? (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-[12px] font-medium leading-snug text-[#171730] hover:text-[#7c2ae8]"
                      >
                        {h.handle}
                      </a>
                    ) : (
                      <p className="truncate text-[12px] font-medium leading-snug text-[#171730]">{h.handle}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => copy(key, h.handle)} className={copyBtn} aria-label={`Copy ${h.label}`}>
                    {copiedKey === key ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copiedKey === key ? 'Copied' : 'Copy'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0a66c2] py-2 text-[12px] font-medium text-white transition hover:bg-[#0958a8]"
        >
          Post on LinkedIn <Arrow dir="up-right" />
        </a>
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#111] py-2 text-[12px] font-medium text-white transition hover:bg-black"
        >
          Post on X <Arrow dir="up-right" />
        </a>
      </div>
    </div>
  );
}
