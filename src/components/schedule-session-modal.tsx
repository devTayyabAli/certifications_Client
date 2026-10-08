"use client";

import { useEffect, useState } from "react";
import {
  copyEventDetails,
  downloadIcsFile,
  formatSessionWindow,
  generateGoogleCalendarUrl,
  generateOffice365CalendarUrl,
  generateOutlookCalendarUrl,
  localTimeZone,
  moduleIcsUrl,
  PROTON_CALENDAR_URL,
  parseSessionDates,
  SessionData,
} from "@/lib/calendar";

/**
 * Opens the server's .ics when there is one (Apple devices hand it straight
 * to Calendar), otherwise downloads one built in the browser.
 */
function openIcs(session: SessionData, filename: string) {
  const url = moduleIcsUrl(session);
  if (!url) {
    downloadIcsFile(session, filename);
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
import { CalendarProvider, scheduledSessionsStore } from "@/lib/cohort-progress";

export type { SessionData };

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionData | null;
  onScheduled?: (session: SessionData, provider: CalendarProvider) => void;
}

export default function ScheduleSessionModal({
  isOpen,
  onClose,
  session,
  onScheduled,
}: ScheduleSessionModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider>("google");
  const [outlookVariant, setOutlookVariant] = useState<"live" | "office365">("live");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const { start } = parseSessionDates(session);
  const formattedDay = start.getDate();

  const handleCopyDetails = async () => {
    const success = await copyEventDetails(session);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    if (selectedProvider === "google") {
      const url = generateGoogleCalendarUrl(session);
      window.open(url, "_blank");
    } else if (selectedProvider === "apple") {
      openIcs(session, `${session.slug || session.id || "session"}-apple.ics`);
    } else if (selectedProvider === "outlook") {
      const url =
        outlookVariant === "office365"
          ? generateOffice365CalendarUrl(session)
          : generateOutlookCalendarUrl(session);
      window.open(url, "_blank");
    } else if (selectedProvider === "proton") {
      // Proton has no pre-filled event link: open it, and hand over the .ics to import
      window.open(PROTON_CALENDAR_URL, "_blank", "noopener");
      openIcs(session, `${session.slug || session.id || "session"}-proton.ics`);
    } else {
      // Universal .ics / Custom
      openIcs(session, `${session.slug || session.id || "session"}.ics`);
    }

    // Persist in local persistent store
    const current = scheduledSessionsStore.get();
    scheduledSessionsStore.set({
      ...current,
      [session.id]: selectedProvider,
    });

    setIsSubmitting(false);
    onScheduled?.(session, selectedProvider);
    onClose();
  };

  const getButtonLabel = () => {
    if (isSubmitting) return "Scheduling...";
    if (selectedProvider === "google") return "Add to Google Calendar";
    if (selectedProvider === "apple") return "Download Apple Calendar (.ics)";
    if (selectedProvider === "outlook")
      return outlookVariant === "office365"
        ? "Open in Microsoft 365"
        : "Open in Outlook.com";
    if (selectedProvider === "proton") return "Download event & open Proton Calendar";
    return "Download Universal .ics";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-[460px] max-h-[92vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-[#ececf2] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 grid size-7 place-items-center rounded-full text-[#8e8ea6] hover:bg-gray-100 hover:text-[#171730] transition cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="pr-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f2eafd] px-2.5 py-0.5 text-[10.5px] font-bold text-[#7c2ae8] mb-2">
            <span>📅</span>
            <span>{session.weekLabel || "COHORT SESSION"}</span>
          </div>
          <h2 id="schedule-modal-title" className="text-[17.5px] font-bold text-[#171730] leading-snug">
            {session.title}
          </h2>
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#171730]">
            <span aria-hidden="true">🕔</span>
            {formatSessionWindow(session)}
          </p>
          <p className="mt-0.5 text-[11px] text-[#8e8ea6]">Shown in your time zone ({localTimeZone()})</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#5f5f7a]">
            Add this live cohort session to your calendar. You’ll get a reminder 15 minutes before it starts.
          </p>
        </div>

        {/* Calendar Provider Options */}
        <div className="mt-4.5 space-y-2.5">
          {/* 1. Google Calendar Option */}
          <div
            onClick={() => setSelectedProvider("google")}
            className={`flex items-center justify-between rounded-xl border p-3.5 transition cursor-pointer select-none ${
              selectedProvider === "google"
                ? "border-[#7c2ae8] bg-[#faf7ff] ring-1 ring-[#7c2ae8]"
                : "border-[#e5e5ed] bg-white hover:border-[#cfcfdb] hover:bg-[#fafafc]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs">
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.43 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.43l4.03-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#171730]">
                  Google Calendar
                </p>
                <p className="text-[11px] text-[#8e8ea6]">
                  Sync event to personal or corporate Google account
                </p>
              </div>
            </div>

            <div
              className={`grid size-4.5 place-items-center rounded-full border transition ${
                selectedProvider === "google"
                  ? "border-[#7c2ae8] bg-[#7c2ae8]"
                  : "border-[#cfcfdb] bg-white"
              }`}
            >
              {selectedProvider === "google" && (
                <div className="size-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>

          {/* 2. Apple Calendar Option */}
          <div
            onClick={() => setSelectedProvider("apple")}
            className={`flex items-center justify-between rounded-xl border p-3.5 transition cursor-pointer select-none ${
              selectedProvider === "apple"
                ? "border-[#7c2ae8] bg-[#faf7ff] ring-1 ring-[#7c2ae8]"
                : "border-[#e5e5ed] bg-white hover:border-[#cfcfdb] hover:bg-[#fafafc]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs">
                <div className="flex flex-col items-center justify-center w-5.5 h-5.5 rounded overflow-hidden border border-[#d1d1db]">
                  <div className="w-full bg-[#ef4444] h-1.5" />
                  <div className="w-full bg-white flex items-center justify-center text-[9px] font-bold text-[#171730] leading-none pt-0.5">
                    {formattedDay}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#171730]">
                  Apple Calendar / iOS
                </p>
                <p className="text-[11px] text-[#8e8ea6]">
                  Direct sync for Mac, iPhone, and iPad
                </p>
              </div>
            </div>

            <div
              className={`grid size-4.5 place-items-center rounded-full border transition ${
                selectedProvider === "apple"
                  ? "border-[#7c2ae8] bg-[#7c2ae8]"
                  : "border-[#cfcfdb] bg-white"
              }`}
            >
              {selectedProvider === "apple" && (
                <div className="size-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>

          {/* 3. Microsoft Outlook Option */}
          <div
            onClick={() => setSelectedProvider("outlook")}
            className={`rounded-xl border p-3.5 transition cursor-pointer select-none ${
              selectedProvider === "outlook"
                ? "border-[#7c2ae8] bg-[#faf7ff] ring-1 ring-[#7c2ae8]"
                : "border-[#e5e5ed] bg-white hover:border-[#cfcfdb] hover:bg-[#fafafc]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs">
                  <div className="grid size-5.5 place-items-center rounded bg-[#0078d4] text-[10px] font-black text-white leading-none shadow-2xs">
                    O
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#171730]">
                    Microsoft Outlook
                  </p>
                  <p className="text-[11px] text-[#8e8ea6]">
                    Outlook.com, Live, and Microsoft 365 accounts
                  </p>
                </div>
              </div>

              <div
                className={`grid size-4.5 place-items-center rounded-full border transition ${
                  selectedProvider === "outlook"
                    ? "border-[#7c2ae8] bg-[#7c2ae8]"
                    : "border-[#cfcfdb] bg-white"
                }`}
              >
                {selectedProvider === "outlook" && (
                  <div className="size-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>

            {selectedProvider === "outlook" && (
              <div className="mt-3 pt-2.5 border-t border-[#eedffc] flex gap-2 animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOutlookVariant("live");
                  }}
                  className={`flex-1 rounded-lg py-1.5 px-2 text-[11px] font-semibold transition cursor-pointer ${
                    outlookVariant === "live"
                      ? "bg-[#7c2ae8] text-white shadow-2xs"
                      : "bg-white border border-[#e5e5ed] text-[#5f5f7a] hover:bg-[#fafafc]"
                  }`}
                >
                  Outlook.com / Live
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOutlookVariant("office365");
                  }}
                  className={`flex-1 rounded-lg py-1.5 px-2 text-[11px] font-semibold transition cursor-pointer ${
                    outlookVariant === "office365"
                      ? "bg-[#7c2ae8] text-white shadow-2xs"
                      : "bg-white border border-[#e5e5ed] text-[#5f5f7a] hover:bg-[#fafafc]"
                  }`}
                >
                  Office / Microsoft 365
                </button>
              </div>
            )}
          </div>

          {/* 4. Proton Calendar Option */}
          <div
            onClick={() => setSelectedProvider("proton")}
            className={`rounded-xl border p-3.5 transition cursor-pointer select-none ${
              selectedProvider === "proton"
                ? "border-[#7c2ae8] bg-[#faf7ff] ring-1 ring-[#7c2ae8]"
                : "border-[#e5e5ed] bg-white hover:border-[#cfcfdb] hover:bg-[#fafafc]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs">
                  <div className="grid size-5.5 place-items-center rounded bg-gradient-to-br from-[#6d4aff] to-[#a995ff] text-[10px] font-black text-white leading-none shadow-2xs">
                    P
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#171730]">Proton Calendar</p>
                  <p className="text-[11px] text-[#8e8ea6]">End-to-end encrypted calendar by Proton</p>
                </div>
              </div>

              <div
                className={`grid size-4.5 place-items-center rounded-full border transition ${
                  selectedProvider === "proton" ? "border-[#7c2ae8] bg-[#7c2ae8]" : "border-[#cfcfdb] bg-white"
                }`}
              >
                {selectedProvider === "proton" && <div className="size-1.5 rounded-full bg-white" />}
              </div>
            </div>

            {selectedProvider === "proton" && (
              <ol className="mt-3 space-y-1 border-t border-[#eedffc] pt-2.5 pl-4 text-[11px] leading-relaxed text-[#5f5f7a] list-decimal animate-in fade-in duration-150">
                <li>We download the session file and open Proton Calendar in a new tab.</li>
                <li>
                  In Proton Calendar, go to <strong>Settings → Import/export</strong>.
                </li>
                <li>
                  Click <strong>Import from ICS</strong> and choose the downloaded file.
                </li>
              </ol>
            )}
          </div>

          {/* 5. Universal .ics / Other Calendar Option */}
          <div
            onClick={() => setSelectedProvider("custom")}
            className={`flex items-center justify-between rounded-xl border p-3.5 transition cursor-pointer select-none ${
              selectedProvider === "custom"
                ? "border-[#7c2ae8] bg-[#faf7ff] ring-1 ring-[#7c2ae8]"
                : "border-[#e5e5ed] bg-white hover:border-[#cfcfdb] hover:bg-[#fafafc]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs text-[#7c2ae8]">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-[#171730]">
                    Universal .ics / Other
                  </p>
                  <span className="rounded-full bg-[#f2eafd] px-1.5 py-0.2 text-[9.5px] font-bold text-[#7c2ae8]">
                    RFC 5545
                  </span>
                </div>
                <p className="text-[11px] text-[#8e8ea6]">
                  Standard .ics for Thunderbird, CalDAV, and desktop apps
                </p>
              </div>
            </div>

            <div
              className={`grid size-4.5 place-items-center rounded-full border transition ${
                selectedProvider === "custom"
                  ? "border-[#7c2ae8] bg-[#7c2ae8]"
                  : "border-[#cfcfdb] bg-white"
              }`}
            >
              {selectedProvider === "custom" && (
                <div className="size-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>
        </div>

        {/* Copy Event Details Option */}
        <div className="mt-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={handleCopyDetails}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#7c2ae8] hover:text-[#5e19b5] transition cursor-pointer"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>{copied ? "Event details copied to clipboard! ✓" : "Copy event details to clipboard"}</span>
          </button>
        </div>

        {/* Action Button */}
        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full rounded-xl bg-[#1c1435] py-3 text-[13px] font-bold text-white shadow-md hover:bg-[#281b4d] active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
          >
            {getButtonLabel()}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-[12px] font-medium text-[#8e8ea6] hover:text-[#171730] transition cursor-pointer py-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
