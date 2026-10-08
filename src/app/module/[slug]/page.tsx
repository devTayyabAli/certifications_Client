import type { Metadata } from "next";
import ModuleView from "../module-view";

export const metadata: Metadata = {
  title: "Module — Si Her DeFi",
  description: "Watch the session, meet the speakers and take the quiz to earn your weekly badge.",
};

export default async function ModulePage({ params }: PageProps<"/module/[slug]">) {
  const { slug } = await params;
  return <ModuleView slug={decodeURIComponent(slug)} />;
}
