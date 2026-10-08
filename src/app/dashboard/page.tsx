import type { Metadata } from "next";
import DashboardView from "./dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard — Si Her DeFi",
  description: "Welcome to your Si Her DeFi dashboard. Track your modules, badges, and cohort progress.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
