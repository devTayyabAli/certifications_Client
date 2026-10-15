import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import { CertificateArt } from "@/components/certificate/CertificateArt";
import { Arrow } from "@/components/ui/Arrow";
import { Check } from "@/components/ui/Check";
import { API_BASE_URL, type CertificateData, type PublicCertificate } from "@/lib/api";
import { formatIssueDate } from "@/lib/certificate";
import { assetPath, SHARE_IMAGE } from "@/lib/constants";

/**
 * Public certificate verification — anyone with the link (e.g. from LinkedIn)
 * can confirm the credential is real. No sign-in. Rendered on the server so
 * link previews carry the learner's name and credential.
 */

async function loadCertificate(code: string): Promise<PublicCertificate | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/certificate/verify/${encodeURIComponent(code)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return (payload?.data ?? null) as PublicCertificate | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps<"/credential/[code]">): Promise<Metadata> {
  const { code } = await params;
  const cert = await loadCertificate(decodeURIComponent(code));
  if (!cert) {
    return { title: "Certificate not found — Si Her DeFi", robots: { index: false } };
  }
  const title = `${cert.recipientName} — ${cert.content.credentialName}`;
  const description = `Verified ${cert.content.programName} certificate · ${cert.content.cohortLabel} · ${cert.badges.length} of ${cert.totalBadges} module badges · issued ${formatIssueDate(cert.issuedAt)}.`;
  return {
    title,
    description,
    // Personal record: shareable by link, but kept out of search engines
    robots: { index: false, follow: false },
    // Replaces the site-wide card, so the brand image and site name are repeated here
    openGraph: { title, description, type: "website", siteName: "Si Her DeFi", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE.url] },
  };
}

export default async function CredentialPage({ params }: PageProps<"/credential/[code]">) {
  const { code } = await params;
  const cert = await loadCertificate(decodeURIComponent(code));

  // the certificate card takes the learner's certificate shape; a public one has no wallet or open modules
  const art: CertificateData | null = cert
    ? {
        status: cert.status,
        recipientName: cert.recipientName,
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
    <div className="min-h-screen bg-[#f8f8fc] font-sans antialiased text-[#171730]">
      <header className="flex h-16 items-center justify-between border-b border-[#ececf2] bg-white px-6 sm:px-10">
        <Link href="/login">
          <Image
            alt="Si Her DeFi Artwork"
            width={100}
            height={100}
            src={assetPath("/Logo · SI HER DeFi.png")}
            style={{ width: "auto", height: "auto" }}
          />
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e4ed] bg-[#f9fafc] px-3 py-1 text-[10px] font-medium">
          <span className="size-2 rounded-full bg-[#0052ff]" />
          Verified on Base
        </span>
      </header>

      <main className="mx-auto max-w-[760px] space-y-5 px-4 py-10">
        {!cert || !art ? (
          <div className="rounded-2xl border border-[#ececf2] bg-white p-8 text-center">
            <h1 className="text-[16px] font-medium">No certificate matches “{decodeURIComponent(code)}”</h1>
            <p className="mt-1 text-[12.5px] text-[#5f5f7a]">
              Check the link or credential ID and try again, or ask the holder to share it again from their certificate page.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[12.5px] text-[#166534]">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#16a34a] text-white">
                <Check className="size-3.5" strokeWidth={2.4} />
              </span>
              <h1>
                Valid credential · issued to <span className="font-medium">{cert.recipientName}</span> by{" "}
                {cert.content.issuerName} on {formatIssueDate(cert.issuedAt)} · ID{" "}
                <span className="tabular-nums">{cert.verificationCode}</span>
              </h1>
            </div>

            <CertificateArt cert={art} preview={false} weekTitles={{}} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-[#ececf2] bg-white p-5">
                <h2 className="text-[11px] font-medium text-[#8e8ea6]">Modules passed</h2>
                {cert.badges.length === 0 ? (
                  <p className="text-[12.5px] text-[#5f5f7a]">No module badges yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-[12.5px] text-[#171730]">
                    {cert.badges.map((b) => (
                      <li key={`${b.week}-${b.name}`} className="flex items-center gap-2">
                        <Check className="size-3.5 text-[#16a34a]" />
                        {b.week !== null && (
                          <span className="tabular-nums text-[11px] text-[#8e8ea6]">
                            Week {String(b.week).padStart(2, "0")}
                          </span>
                        )}
                        <span>{b.moduleTitle ?? b.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2 rounded-2xl border border-[#ececf2] bg-white p-5">
                <h2 className="text-[11px] font-medium text-[#8e8ea6]">On-chain record</h2>
                {cert.onChain.explorerUrl ? (
                  <p className="text-[12.5px] text-[#5f5f7a]">
                    Minted on {cert.onChain.network} as token #{cert.onChain.tokenId}.{" "}
                    <a
                      href={cert.onChain.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-cta font-medium text-[#7c2ae8]"
                    >
                      View on BaseScan <Arrow dir="up-right" />
                    </a>
                  </p>
                ) : (
                  <p className="text-[12.5px] leading-relaxed text-[#5f5f7a]">
                    Issued and verified by {cert.content.programName}. Not minted on {cert.onChain.network} yet.
                  </p>
                )}
                {cert.nameHidden && (
                  <p className="text-[11px] text-[#8e8ea6]">The holder has chosen to show only their initials.</p>
                )}
              </div>
            </div>
          </>
        )}

        <p className="text-center text-[11px] text-[#8e8ea6]">
          {cert ? "This page is generated live from Si Her DeFi records." : ""}{" "}
          <a href="https://si3.space" target="_blank" rel="noopener noreferrer" className="link-cta font-medium text-[#7c2ae8]">
            About Si Her DeFi <Arrow dir="up-right" />
          </a>
        </p>
      </main>
    </div>
  );
}
