import type { Metadata } from "next";
import Link from "next/link";

import OnboardingShell, {
  ClockIcon,
  GiftIcon,
  type HighlightItem,
  UserHeaderAction,
  WalletIcon,
} from "@/components/onboarding-shell";
import ConnectWalletForm from "./connect-wallet-form";

export const metadata: Metadata = {
  title: "Connect your wallet — Si Her DeFi",
  description:
    "Connect your wallet to mint your on-chain certificate on Base at the end of the cohort.",
};

const walletHighlights: HighlightItem[] = [
  {
    icon: <WalletIcon />,
    title: "You keep what you earn",
    body: "Your certificate stays in your wallet. Verifiable for a lifetime.",
  },
  {
    icon: <GiftIcon />,
    title: "Connecting costs nothing",
    body: "No payment and no transaction — you're proving the wallet is yours.",
  },
  {
    icon: <ClockIcon />,
    title: "Takes about ten seconds",
    body: "Pick your wallet, approve the request, done.",
  },
];

export default function WalletPage() {
  return (
    <OnboardingShell
      currentStep={2}
      compactCard={false}
      headerAction={<UserHeaderAction />}
      rightTitle="Your certification is yours, not ours."
      rightSubtitle="It mints to your wallet on Base. Nothing here is held in an account we control."
      highlights={walletHighlights}
    >
      <div className="w-full space-y-4">
        {/* Back to the previous step — the profile form re-opens with what was saved */}
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#7c2ae8] transition-colors hover:underline"
        >
          ← Back to profile
        </Link>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#171730]">
            Connect your wallet
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#5f5f7a]">
            This is where your certificate mints at the end of the cohort. We
            only read your address — no funds needed.
          </p>
        </div>

        <ConnectWalletForm />
      </div>
    </OnboardingShell>
  );
}
