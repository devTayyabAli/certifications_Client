import type { CertificateBadge, CertificateContent, CertificateOnChain } from "@/lib/api";
import { assetPath } from "@/lib/constants";
import { formatIssueDate } from "@/lib/certificate";

/**
 * The certificate itself — shared by the learner's certificate page and the
 * public verification page. Purely presentational.
 */
export default function CertificateSheet({
  recipientName,
  content,
  badges,
  totalBadges,
  issuedAt,
  verificationCode,
  verifyUrl,
  onChain,
  preview = false,
}: {
  recipientName: string;
  content: CertificateContent;
  badges: CertificateBadge[];
  totalBadges: number;
  issuedAt: string | null;
  verificationCode: string | null;
  verifyUrl: string | null;
  onChain: CertificateOnChain;
  /** Locked certificate — shown faded with a "preview" mark */
  preview?: boolean;
}) {
  const byWeek = new Map(badges.filter((b) => b.week !== null).map((b) => [b.week!, b]));
  const slots = Array.from({ length: totalBadges }, (_, i) => i + 1);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#ececf2] bg-white p-7 sm:p-10 shadow-md">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5b1ea6] via-[#7526dd] to-[#a855f7]" />
      {preview && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-12 rounded-xl border-2 border-[#ddd6fe] px-6 py-2 text-[22px] font-black tracking-[0.3em] text-[#ddd6fe] uppercase">
            Preview
          </span>
        </div>
      )}

      <div className={`mx-auto max-w-[540px] space-y-5 text-center pt-2 ${preview ? "opacity-60" : ""}`}>
        <div className="mx-auto flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetPath("/Badge_earned.png")}
            alt=""
            className="size-[62px] object-contain drop-shadow-[0_6px_14px_rgba(124,42,232,0.3)]"
          />
        </div>

        <p className="text-[10px] font-semibold tracking-[0.26em] text-[#8e8ea6] uppercase">Certificate of completion</p>

        <h2 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[#171730] break-words">
          {recipientName || "Your name"}
        </h2>

        <p className="mx-auto max-w-[460px] text-[12px] leading-relaxed text-[#5f5f7a]">{content.statement}</p>

        <div className="pt-1">
          <p className="text-[15px] font-extrabold tracking-[0.2em] text-[#171730] uppercase">{content.programName}</p>
          <p className="mt-1 text-[9.5px] font-semibold tracking-[0.2em] text-[#8e8ea6] uppercase">
            {content.cohortLabel} · {content.cohortDates} · Powered by {onChain.network}
          </p>
        </div>

        <div className="relative flex items-center justify-center pt-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#ececf2]" />
          </div>
          <span className="relative bg-white px-3 text-[9px] font-bold tracking-[0.2em] text-[#8e8ea6] uppercase">
            Module badges earned · {badges.length} of {totalBadges}
          </span>
        </div>

        <div className="mx-auto flex max-w-[460px] flex-wrap items-center justify-center gap-2 sm:gap-3 py-1">
          {slots.map((week) => {
            const badge = byWeek.get(week);
            return badge ? (
              <div
                key={week}
                className="relative size-[38px] sm:size-[46px] drop-shadow-xs"
                title={`Week ${week}: ${badge.moduleTitle ?? badge.name} — ${badge.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetPath(badge.image)} alt={badge.name} className="size-full object-contain" />
              </div>
            ) : (
              <div
                key={week}
                className="relative grid size-[38px] sm:size-[46px] place-items-center"
                title={`Week ${week} — not earned yet`}
              >
                <svg viewBox="0 0 100 115" className="absolute inset-0 size-full">
                  <polygon
                    points="50 3, 97 29, 97 86, 50 112, 3 86, 3 29"
                    fill="none"
                    stroke="#d8d8e5"
                    strokeWidth="3"
                    strokeDasharray="7 6"
                  />
                </svg>
                <span className="relative text-[10px] font-bold text-[#c4c4d4]">{String(week).padStart(2, "0")}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-0 rounded-xl border border-[#ececf2] bg-[#f9fafc] p-3 text-center text-[10px]">
          <div className="space-y-0.5 sm:border-r sm:border-[#ececf2]/80">
            <p className="font-semibold text-[#8e8ea6] tracking-wider uppercase text-[9px]">Issued</p>
            <p className="font-medium text-[#171730]">{formatIssueDate(issuedAt) || "After the Week 1 quiz"}</p>
          </div>
          <div className="space-y-0.5 sm:border-r sm:border-[#ececf2]/80">
            <p className="font-semibold text-[#8e8ea6] tracking-wider uppercase text-[9px]">Credential ID</p>
            <p className="font-mono text-[10px] text-[#171730]">{verificationCode ?? "—"}</p>
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-[#8e8ea6] tracking-wider uppercase text-[9px]">
              {onChain.txHash ? "On-chain" : "Network"}
            </p>
            {onChain.explorerUrl ? (
              <a
                href={onChain.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 font-semibold text-[#7c2ae8] hover:underline"
              >
                <span className="size-1.5 rounded-full bg-[#0052ff]" />
                Token #{onChain.tokenId} ↗
              </a>
            ) : (
              <p className="inline-flex items-center justify-center gap-1 font-semibold text-[#171730]">
                <span className="size-1.5 rounded-full bg-[#0052ff]" />
                {onChain.network}
              </p>
            )}
          </div>
        </div>

        {verifyUrl && (
          <p className="text-[10.5px] text-[#8e8ea6] break-all">
            Verify at{" "}
            <a href={verifyUrl} className="font-medium text-[#7c2ae8] hover:underline">
              {verifyUrl.replace(/^https?:\/\//, "")}
            </a>
          </p>
        )}

        <div className="flex items-center justify-between gap-4 pt-5 text-left border-t border-[#f0f0f5]">
          <div>
            <p className="text-[9px] font-bold tracking-wider text-[#8e8ea6] uppercase">Issued by</p>
            <p className="text-[13px] font-black tracking-wider text-[#171730]">{content.issuerName}</p>
            <p className="text-[9.5px] text-[#8e8ea6]">{content.issuerTagline}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold tracking-wider text-[#8e8ea6] uppercase">Presented by</p>
            <p className="text-[13px] font-black tracking-wider text-[#171730]">{content.presenterName}</p>
            <p className="text-[9.5px] text-[#8e8ea6]">{content.presenterTagline}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
