// LinkedIn and X share buttons for one module badge: the posts come from the
// server, written to tag the session's partners (see CertificateService).
import { Arrow } from '@/components/ui/Arrow';
import type { CertificateBadge } from '@/lib/api';

export function BadgeShareButtons({ badge }: { badge: Pick<CertificateBadge, 'name' | 'share'> }) {
  const fallback = `I just earned the "${badge.name}" badge in Si Her DeFi! #SiHerDeFi`;
  return (
    <div className="grid grid-cols-2 gap-2">
      <a
        href={`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(badge.share?.linkedin ?? fallback)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0a66c2] py-2 text-[12px] font-medium text-white transition hover:bg-[#0958a8]"
      >
        LinkedIn <Arrow dir="up-right" />
      </a>
      <a
        href={`https://x.com/intent/post?text=${encodeURIComponent(badge.share?.x ?? fallback)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#111] py-2 text-[12px] font-medium text-white transition hover:bg-black"
      >
        X <Arrow dir="up-right" />
      </a>
    </div>
  );
}
