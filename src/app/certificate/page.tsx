import type { Metadata } from "next";
import CertificateView from "./certificate-view";

export const metadata: Metadata = {
  title: "Your Certificate — Si Her DeFi",
  description: "Your Si Her DeFi certificate: share it, add it to LinkedIn, and verify it publicly.",
};

export default function CertificatePage() {
  return <CertificateView />;
}
