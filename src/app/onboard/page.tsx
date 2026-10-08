import type { Metadata } from "next";
import OnboardView from "./onboard-view";

export const metadata: Metadata = {
  title: "Si Her Onboard — Si Her DeFi",
  description: "Watch the welcome video, follow Si<3> and share where you're starting from before the modules open.",
};

export default function OnboardPage() {
  return <OnboardView />;
}
