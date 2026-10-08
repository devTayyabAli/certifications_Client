import type { Metadata } from "next";
import Link from "next/link";

import OnboardingShell, {
  primaryButtonClasses,
} from "@/components/onboarding-shell";
import RequireAuth from "@/components/require-auth";

export const metadata: Metadata = {
  title: "Email verified — Si Her DeFi",
  description:
    "Your email is verified and your Si Her DeFi seat is held. Two short steps left.",
};

export default function VerifiedPage() {
  return (
    <OnboardingShell
      currentStep={1}
      headerAction={
        <a
          href="/help"
          className="font-semibold text-brand transition-colors hover:text-brand-strong hover:underline"
        >
          Need help?
        </a>
      }
    >
      <RequireAuth />

      {/* Centered Mint-green Success Badge */}
      <div className="flex justify-center">
        <span className="grid size-14 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]">
          <CheckIcon />
        </span>
      </div>

      {/* Heading */}
      <h1 className="mt-4 text-center text-[22px] font-bold tracking-tight text-ink">
        Email verified
      </h1>

      {/* Subtitle */}
      <p className="mx-auto mt-2 max-w-[290px] text-center text-[13px] leading-relaxed text-muted">
        You’re in, and your seat in Si Her DeFi is held. Two short steps left.
      </p>

      {/* Step 2 Inset Teaser Card */}
      <div className="mt-6 flex items-start gap-3.5 rounded-xl bg-[#f8f7fc] p-3.5 border border-[#eceaf6]">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white shadow-xs mt-4">
          2
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[13px] font-bold text-ink">
            Create your profile
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
            Name, title, a line about you, and a photo. About a minute.
          </p>
        </div>
      </div>

      {/* Continue Action Button — client-side navigation via Link */}
      <Link href="/profile" className={`mt-6 ${primaryButtonClasses()}`}>
        <span>Continue</span>
        <span aria-hidden="true" className="text-base font-normal">
          →
        </span>
      </Link>

      {/* Bottom Note */}
      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-muted">
        The name you enter next is the one printed on your certificate.
      </p>
    </OnboardingShell>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[26px] text-[#16a34a]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  );
}
