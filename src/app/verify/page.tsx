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
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const { email } = await searchParams;
  const address = (Array.isArray(email) ? email[0] : email)?.trim();

  if (!address) redirect("/login");

  return (
    <OnboardingShell
      currentStep={0}
      compactCard={true}
      headerAction={
        <span className="text-[#5f5f7a]">
          Need help? Please message <span className="font-medium text-[#171730]">dao@si3.space</span>.
        </span>
      }
    >
      <h1 className="text-center text-xl font-medium tracking-tight text-[#171730]">
        Check your inbox
      </h1>
      <p className="mt-2 text-center text-[13px] leading-relaxed text-[#5f5f7a]">
        We sent a 6-digit code to
      </p>
      <p className="text-center text-[13px] leading-relaxed">
        <span className="font-medium text-[#171730]">{address}</span>{" "}
        <span className="text-[#8688ae]">·</span>{" "}
        <Link
          href="/login"
          className="font-medium text-[#7c2ae8] underline underline-offset-2"
        >
          change
        </Link>
      </p>

      <VerifyCodeForm email={address} />

      <p className="mt-5 text-center text-[11px] leading-relaxed text-[#8688ae]">
        Check spam if it hasn’t landed in a minute. This code expires after 10 minutes.
      </p>
    </OnboardingShell>
  );
}
