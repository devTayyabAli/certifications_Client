'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CertificateArt } from '@/components/certificate/CertificateArt';
import { assetPath } from '@/lib/constants';
import { certificateApi, type PublicCertificate, type CertificateData } from '@/lib/api';
import { Check } from '@/components/ui/Check';

export default function VerifyCertificatePage() {
  const { code } = useParams<{ code: string }>();
  const [cert, setCert] = useState<PublicCertificate | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setMissing(false);
    certificateApi
      .verifyPublic(code)
      .then((c) => {
        setCert(c);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [code]);

  const certificateData: CertificateData | null = cert
    ? {
        status: cert.status,
        recipientName: cert.nameHidden ? 'Anonymous Learner' : cert.recipientName,
        walletAddress: null,
        issuedAt: cert.issuedAt,
        verificationCode: cert.verificationCode,
        verifyUrl: null,
        unlockModule: null,
        content: cert.content,
        badges: cert.badges,
        totalBadges: cert.totalBadges,
        stillOpen: [],
        onChain: cert.onChain,
        canMint: false,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#f8f8fc] text-[#171730] font-sans antialiased">
      <header className="flex h-16 items-center justify-between border-b border-[#ececf2] bg-white px-6 sm:px-10">
        <Link href="/login">
          <Image
            alt="Si Her DeFi Artwork"
            width={120}
            height={32}
            src={assetPath('/Logo · SI HER DeFi.png')}
            style={{ width: 'auto', height: 'auto' }}
          />
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e4ed] bg-[#f9fafc] px-3 py-1 text-[11px] font-medium text-[#151534]">
          <span className="size-2 rounded-full bg-[#0052ff]" />
          Verified on Base
        </span>
      </header>

      <main className="mx-auto max-w-[760px] px-4 py-10 space-y-5">
        {missing ? (
          <div className="rounded-2xl border border-[#ececf2] bg-white p-8 text-center shadow-xs">
            <p className="text-[16px] font-medium text-[#171730]">
              No certificate matches “{code}”
            </p>
            <p className="mt-1 text-[12.5px] text-[#5f5f7a]">
              Check the link or credential ID and try again.
            </p>
          </div>
        ) : loading || !certificateData ? (
          <div className="grid min-h-[50vh] place-items-center text-[#7c2ae8]">
            <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[12.5px] text-[#166534]">
              <span className="grid size-5 place-items-center rounded-full bg-[#16a34a] text-white">
                <Check className="size-3.5" strokeWidth={2.4} />
              </span>
              <span>
                Valid credential · issued to{' '}
                <span className="font-medium">{certificateData.recipientName}</span> · ID{' '}
                {certificateData.verificationCode}
              </span>
            </div>
            <CertificateArt cert={certificateData} preview={false} weekTitles={{}} />
          </>
        )}
      </main>
    </div>
  );
}
