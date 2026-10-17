import type { Metadata } from "next";
import CertificateView from "./certificate-view";

export const metadata: Metadata = {
  title: "Your Achievements — Si Her DeFi",
  description: "Your Si Her DeFi badges and certificate: share your progress, and claim your certificate at the end of the cohort.",
};

export default function CertificatePage() {
  return <CertificateView />;
}
