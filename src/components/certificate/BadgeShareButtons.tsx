// LinkedIn and X share buttons for one module badge: the posts come from the
// server, written to tag the session's partners (see CertificateService).
import { Arrow } from '@/components/ui/Arrow';
import type { CertificateBadge } from '@/lib/api';

export function BadgeShareButtons({ badge }: { badge: Pick<CertificateBadge, 'name' | 'share'> }) {
  const fallback = `I just earned the "${badge.name}" badge in Si Her DeFi! #SiHerDeFi`;
  const x = badge.share?.x?.trim() || fallback;
  const linkedin = badge.share?.linkedin?.trim() || fallback;
  const same = x.replace(/\s+/g, ' ') === linkedin.replace(/\s+/g, ' ');
  return (
    <div className="space-y-2.5">
      {same ? (
        <p className="whitespace-pre-wrap break-words rounded-lg bg-[#f9fafc] px-3 py-2 text-[12px] leading-5 text-[#45465f]">{x}</p>
      ) : (
        <div className="space-y-2 rounded-lg bg-[#f9fafc] px-3 py-2">
          <p className="whitespace-pre-wrap break-words text-[12px] leading-5 text-[#45465f]">
            <span className="font-medium text-[#111]">X. </span>{x}
          </p>
          <p className="whitespace-pre-wrap break-words text-[12px] leading-5 text-[#45465f]">
            <span className="font-medium text-[#0a66c2]">LinkedIn. </span>{linkedin}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(linkedin)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0a66c2] py-2 text-[12px] font-medium text-white transition hover:bg-[#0958a8]"
        >
          LinkedIn <Arrow dir="up-right" />
        </a>
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(x)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#111] py-2 text-[12px] font-medium text-white transition hover:bg-black"
        >
          X <Arrow dir="up-right" />
        </a>
      </div>
    </div>
  );
}
