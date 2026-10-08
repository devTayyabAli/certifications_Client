import { Suspense } from "react";
import type { Metadata } from "next";
import CalendarView from "./calendar-view";

export const metadata: Metadata = {
  title: "Add to Calendar — Si Her DeFi",
  description: "Add your upcoming Si Her DeFi cohort session to Google Calendar, Apple Calendar, Outlook, or universal iCal.",
};

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d091a] text-white flex items-center justify-center p-6">
          <div className="animate-pulse text-[#d1bbfb] text-sm">Loading calendar...</div>
        </div>
      }
    >
      <CalendarView />
    </Suspense>
  );
}
