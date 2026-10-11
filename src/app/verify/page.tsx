import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingLayout, cardV2 } from "@/components/onboarding/v2/OnboardingLayout";
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
    <OnboardingLayout step={0}>
      <section className={cardV2}>
        <h1 className="text-center text-xl font-medium tracking-tight text-[#151534]">
          Check your inbox
        </h1>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-[#4c4d77]">
          We sent a 6-digit code to
        </p>
        <p className="text-center text-[13px] leading-relaxed">
          <span className="font-medium text-[#151534]">{address}</span>{" "}
          <span className="text-[#8688ae]">·</span>{" "}
          <Link
            href="/login"
            className="font-medium text-[#7b2fbe] underline underline-offset-2"
          >
            change
          </Link>
        </p>

        <VerifyCodeForm email={address} />

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[#8688ae]">
          Check spam if it hasn’t landed in a minute. This code expires after 10 minutes.
        </p>
      </section>
    </OnboardingLayout>
  );
}
