import type { Metadata } from "next";

import OnboardingShell from "@/components/onboarding-shell";
import ClaimSeatForm from "./claim-seat-form";

export const metadata: Metadata = {
  title: "Claim your seat — Si Her DeFi",
  description:
    "Verify your email to claim your seat in the Si Her DeFi cohort. Twelve partner-led modules and an on-chain certificate on Base.",
};

export default function LoginPage() {
  return (
    <OnboardingShell
      currentStep={0}
      headerAction={
        <span className="text-muted">
          Already registered? Use the same email to sign in.
        </span>
      }
    >
      <h1 className="text-xl font-semibold tracking-tight text-ink">
        Claim your seat
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Enter the same email address you used to apply for Si Her DeFi. We’ll
        send a 6-digit code — no password to make or remember.
      </p>

      <ClaimSeatForm />

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        By continuing you agree to the{" "}
        <a
          href="https://si3.space/policy/membersPolicy"
          className="font-semibold text-brand underline underline-offset-2"
          target="_blank"

        >
          cohort guidelines
        </a>
        . We’ll only email you about Si Her DeFi.
      </p>
    </OnboardingShell>
  );
}
