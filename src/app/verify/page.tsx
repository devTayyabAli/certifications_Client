import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import OnboardingShell from "@/components/onboarding-shell";
import VerifyCodeForm from "./verify-code-form";

export const metadata: Metadata = {
  title: "Check your inbox — Si Her DeFi",
  description:
    "Enter the 6-digit code we emailed you to verify your address and claim your Si Her DeFi seat.",
};

export default async function VerifyPage({
  searchParams,
}: PageProps<"/verify">) {
  const { email } = await searchParams;
  const address = (Array.isArray(email) ? email[0] : email)?.trim();

  // Without an email there is no code to check — start from the login step.
  if (!address) redirect("/login");

  return (
    <OnboardingShell
      currentStep={0}
      headerAction={
        <a href="/help" className="font-semibold text-brand hover:underline">
          Need help?
        </a>
      }
    >
      <h1 className="text-center text-xl font-semibold tracking-tight text-ink">
        Check your inbox
      </h1>
      <p className="mt-2 text-center text-[13px] leading-relaxed text-muted">
        We sent a 6-digit code to
      </p>
      <p className="text-center text-[13px] leading-relaxed">
        <span className="font-semibold text-ink">{address}</span>
        <span className="text-muted"> · </span>
        <Link
          href="/login"
          className="font-semibold text-brand underline underline-offset-2"
        >
          change
        </Link>
      </p>

      <VerifyCodeForm email={address} />

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
        Check spam if it hasn’t landed in a minute. This code expires after 10
        minutes.
      </p>
    </OnboardingShell>
  );
}
