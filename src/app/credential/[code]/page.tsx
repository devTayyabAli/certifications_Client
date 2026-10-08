import type { Metadata } from "next";

import CertificateSheet from "@/components/certificate-sheet";
import { Wordmark } from "@/components/onboarding-shell";
import { API_BASE_URL, type PublicCertificate } from "@/lib/api";
import { formatIssueDate } from "@/lib/certificate";

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
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CredentialPage({ params }: PageProps<"/credential/[code]">) {
  const { code } = await params;
  const cert = await loadCertificate(decodeURIComponent(code));

  return (
    <div className="min-h-screen bg-[#f8f8fc] font-sans antialiased text-[#171730]">
      <header className="border-b border-[#ececf2] bg-white">
        <div className="mx-auto flex max-w-[960px] items-center justify-between px-4 py-3 sm:px-6">
          <Wordmark />
          <span className="text-[11px] font-semibold tracking-wider text-[#8e8ea6] uppercase">
            Credential verification
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[960px] space-y-6 px-4 py-8 sm:px-6">
        {!cert ? (
          <div className="rounded-2xl border border-[#ececf2] bg-white p-8 text-center shadow-xs">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#fef2f2] text-[20px] text-[#dc2626]">
              ✕
            </span>
            <h1 className="mt-4 text-[20px] font-bold">We couldn’t verify this certificate</h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[#5f5f7a]">
              No Si Her DeFi certificate matches the code <span className="font-mono">{decodeURIComponent(code)}</span>.
              Check the link, or ask the holder to share it again from their certificate page.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#16a34a] text-white">✓</span>
                <div>
                  <h1 className="text-[16px] font-bold text-[#14532d]">Verified credential</h1>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#166534]">
                    Issued to <strong>{cert.recipientName}</strong> by {cert.content.issuerName} on{" "}
                    {formatIssueDate(cert.issuedAt)} · {cert.content.programName} {cert.content.cohortLabel}
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-[#166534]">
                <p className="font-semibold uppercase tracking-wider text-[9.5px]">Credential ID</p>
                <p className="font-mono text-[12px]">{cert.verificationCode}</p>
              </div>
            </div>

            <CertificateSheet
              recipientName={cert.recipientName}
              content={cert.content}
              badges={cert.badges}
              totalBadges={cert.totalBadges}
              issuedAt={cert.issuedAt}
              verificationCode={cert.verificationCode}
              verifyUrl={null}
              onChain={cert.onChain}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#ececf2] bg-white p-5 shadow-2xs space-y-2">
                <h2 className="text-[10.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">Modules passed</h2>
                {cert.badges.length === 0 ? (
                  <p className="text-[12.5px] text-[#5f5f7a]">No module badges yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-[12.5px] text-[#171730]">
                    {cert.badges.map((b) => (
                      <li key={`${b.week}-${b.name}`} className="flex items-center gap-2">
                        <span className="text-[#16a34a]">✓</span>
                        {b.week !== null && (
                          <span className="font-mono text-[11px] text-[#8e8ea6]">
                            W{String(b.week).padStart(2, "0")}
                          </span>
                        )}
                        <span>{b.moduleTitle ?? b.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-[#ececf2] bg-white p-5 shadow-2xs space-y-2">
                <h2 className="text-[10.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">On-chain record</h2>
                {cert.onChain.explorerUrl ? (
                  <p className="text-[12.5px] text-[#5f5f7a]">
                    Minted on {cert.onChain.network} as token #{cert.onChain.tokenId}.{" "}
                    <a
                      href={cert.onChain.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#7c2ae8] hover:underline"
                    >
                      View on BaseScan ↗
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
          <a href="https://si3.space" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#7c2ae8] hover:underline">
            About Si Her DeFi ↗
          </a>
        </p>
      </main>
    </div>
  );
}
