import type { Metadata } from "next";
import CalendarView from "./calendar-view";

export const metadata: Metadata = {
  title: "Calendar — Si Her DeFi",
  description: "Every live session and LinkedIn Live in the Si Her DeFi cohort, by month.",
};

export default function CalendarPage() {
  return <CalendarView />;
}
