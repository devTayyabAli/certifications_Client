import type { Metadata } from "next";
import CurrentModuleRedirect from "./current-module-redirect";

export const metadata: Metadata = {
  title: "Module — Si Her DeFi",
  description: "Your current Si Her DeFi module.",
};

/** /module (older links) → the learner's current module. */
export default function ModuleIndexPage() {
  return <CurrentModuleRedirect />;
}
