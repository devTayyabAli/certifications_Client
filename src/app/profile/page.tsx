import type { Metadata } from "next";
import { Suspense } from "react";

import OnboardingShell, {
  BadgeIcon,
  CertificateIcon,
  GiftIcon,
  type HighlightItem,
  UserHeaderAction,
} from "@/components/onboarding-shell";
import ProfileForm from "./profile-form";

export const metadata: Metadata = {
  title: "Set up your profile — Si Her DeFi",
  description:
    "Set up your name, professional title, organization and social profile for your Si Her DeFi certificate.",
};

const profileHighlights: HighlightItem[] = [
  {
    icon: <GiftIcon />,
    title: "Free, for the whole cohort",
    body: "No card, no fees, no token to buy.",
  },
  {
    icon: <BadgeIcon />,
    title: "A badge for every module you pass",
    body: "Earned by quiz, carrying the partner's mark.",
  },
  {
    icon: <CertificateIcon />,
    title: "An on-chain certificate on Base",
    body: "Verifiable, and addable to LinkedIn.",
  },
];

export default function ProfilePage() {
  return (
    <OnboardingShell
      currentStep={1}
      compactCard={false}
      headerAction={<UserHeaderAction />}
      rightTitle="Your name travels with every badge you earn."
      rightSubtitle="At the end of the cohort, this is what’s written on the certificate you mint."
      highlights={profileHighlights}
    >
      <Suspense fallback={<div className="p-8 text-center text-sm text-[#5f5f7a]">Loading profile...</div>}>
        <ProfileForm />
      </Suspense>
    </OnboardingShell>
  );
}
