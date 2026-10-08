"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  copyEventDetails,
  downloadIcsFile,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  parseSessionDates,
  SessionData,
} from "@/lib/calendar";

// Cohort catalog for fallback and quick selection
const COHORT_SESSIONS_CATALOG: SessionData[] = [
  {
    id: "global-stablecoin-market",
    slug: "global-stablecoin-market",
    title: "The Global Stablecoin Market",
    weekLabel: "WEEK 04 · OCT 19",
    dateLabel: "WEEK 04 · OCT 19",
    startDate: "2026-10-19T17:00:00Z",
    endDate: "2026-10-19T18:00:00Z",
    timezone: "UTC",
    location: "Si Her DeFi Virtual Stage",
    presenter: "KAST",
    description:
      "What actually backs a stablecoin, how they move across markets, and where regulation is heading. Presented by KAST.",
    meetingUrl: "https://siherdefi.org/module/global-stablecoin-market",
  },
  {
    id: "portfolio-alerts-tokenizing-what-matters",
    slug: "portfolio-alerts-tokenizing-what-matters",
    title: "Rarible Meets Real World: Tokenizing What Matters",
    weekLabel: "WEEK 05 · OCT 22",
    dateLabel: "WEEK 05 · OCT 22",
    startDate: "2026-10-22T17:00:00Z",
    endDate: "2026-10-22T18:00:00Z",
    timezone: "UTC",
    location: "Si Her DeFi Virtual Stage",
    presenter: "Rarible",
    description:
      "Rarible Meets Real World: Tokenizing What Matters. Exploring RWA provenance and on-chain liquid markets on Base.",
    meetingUrl: "https://siherdefi.org/module/portfolio-alerts-tokenizing-what-matters",
  },
  {
    id: "trading-with-confidence-derivatives",
    slug: "trading-with-confidence-derivatives",
    title: "Trading With Confidence: DEXs Demystified",
    weekLabel: "WEEK 06 · OCT 29",
    dateLabel: "WEEK 06 · OCT 29",
    startDate: "2026-10-29T17:00:00Z",
    endDate: "2026-10-29T18:00:00Z",
    timezone: "UTC",
    location: "Si Her DeFi Virtual Stage",
    presenter: "Blockchain.com",
    description:
      "Trading With Confidence: DEXs Demystified. Demystifying on-chain liquidity, slippage, and swap mechanics on Base.",
    meetingUrl: "https://siherdefi.org/module/trading-with-confidence-derivatives",
  },
  {
    id: "decentralized-futures",
    slug: "decentralized-futures",
    title: "Decentralized Futures",
    weekLabel: "WEEK 07 · NOV 5",
    dateLabel: "WEEK 07 · NOV 5",
    startDate: "2026-11-05T17:00:00Z",
    endDate: "2026-11-05T18:00:00Z",
    timezone: "UTC",
    location: "Si Her DeFi Virtual Stage",
    presenter: "JupiterBlock Ventures",
    description:
      "Decentralized Futures. Deep dive into synthetic assets, on-chain order books, and decentralized futures settlements.",
    meetingUrl: "https://siherdefi.org/module/decentralized-futures",
  },
  {
    id: "collective-capital-for-creators",
    slug: "collective-capital-for-creators",
    title: "Collective Capital for Creators",
    weekLabel: "WEEK 01 · SEP 24",
    dateLabel: "WEEK 01 · SEP 24",
    startDate: "2026-09-24T17:00:00Z",
    endDate: "2026-09-24T18:00:00Z",
    timezone: "UTC",
    location: "Si Her DeFi Virtual Stage",
    presenter: "Artist Fund & Si Her DAO",
    description:
      "Hands-on intro: how community funds flow to creators and on-chain treasuries. Complete this task to unlock your on-chain certificate on Base.",
    meetingUrl: "https://siherdefi.org/module/collective-capital-for-creators",
  },
];

export default function CalendarView() {
  const searchParams = useSearchParams();
  const rawSessionId = searchParams.get("sessionId") || searchParams.get("id") || "";

  const [overrideSessionId, setOverrideSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Derive active session without triggering extra renders
  const session = useMemo(() => {
    const targetId = (overrideSessionId || rawSessionId).trim().toLowerCase();
    if (targetId) {
      const found = COHORT_SESSIONS_CATALOG.find(
        (s) =>
          s.id.toLowerCase() === targetId ||
          (s.slug && s.slug.toLowerCase() === targetId) ||
          targetId.includes(s.id.toLowerCase())
      );
      if (found) return found;
    }
    return COHORT_SESSIONS_CATALOG[0];
  }, [overrideSessionId, rawSessionId]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0d091a] text-white flex items-center justify-center p-6">
        <div className="animate-pulse text-[#d1bbfb] text-sm">Loading session details...</div>
      </div>
    );
  }

  const { start, end } = parseSessionDates(session);
  const formattedDay = start.getDate();

  const formattedDateString = start.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTimeString = `${start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  })} – ${end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;

  const handleCopy = async () => {
    const ok = await copyEventDetails(session);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadIcs = () => {
    downloadIcsFile(session);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-radial from-[#1e153b] via-[#120c24] to-[#0c0818] text-white flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Brand Header */}
      <div className="w-full max-w-[540px] mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#b8a6db] hover:text-white transition"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#d1bbfb]">
          SI HER DEFI
        </span>
      </div>

      {/* Main Calendar Card */}
      <div className="w-full max-w-[540px] rounded-3xl bg-[#ffffff]/98 text-[#171730] p-6 sm:p-8 shadow-2xl border border-white/20 backdrop-blur-md">
        {/* Session Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="rounded-full bg-[#f2eafd] px-3 py-1 text-[11px] font-extrabold tracking-wide text-[#7c2ae8]">
            {session.weekLabel || "LIVE SESSION"}
          </span>
          {session.presenter && (
            <span className="text-[12px] font-semibold text-[#7c7c98]">
              Presented by <strong className="text-[#171730]">{session.presenter}</strong>
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-[22px] sm:text-[24px] font-extrabold leading-snug tracking-tight text-[#171730]">
          {session.title}
        </h1>

        {/* Date / Time Card */}
        <div className="mt-5 rounded-2xl bg-[#faf9fe] p-4.5 border border-[#eee8f8] space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-[#f0e8fc] text-[#7c2ae8]">
              📅
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#171730]">{formattedDateString}</p>
              <p className="text-[11.5px] font-medium text-[#7c7c98]">{formattedTimeString}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-[#f0ecf6]">
            <div className="grid size-8 place-items-center rounded-lg bg-[#f0e8fc] text-[#7c2ae8]">
              📍
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#171730]">
                {session.location || "Si Her DeFi Virtual Stage"}
              </p>
              <p className="text-[11.5px] text-[#7c7c98]">Interactive workshop on Base</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-[13px] leading-relaxed text-[#5a5a78]">
          {session.description}
        </p>

        {/* Section Heading */}
        <div className="mt-6 mb-3 flex items-center justify-between">
          <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#8e8ea6]">
            Select your calendar platform
          </span>
          {copied && (
            <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in flex items-center gap-1">
              ✓ Details Copied!
            </span>
          )}
          {downloadSuccess && (
            <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in flex items-center gap-1">
              ✓ .ICS Downloaded!
            </span>
          )}
        </div>

        {/* 4 Calendar Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Google Calendar */}
          <button
            type="button"
            onClick={() => window.open(generateGoogleCalendarUrl(session), "_blank")}
            className="flex items-center gap-3 rounded-xl border border-[#e5e5ed] p-3 hover:border-[#7c2ae8] hover:bg-[#faf7ff] transition cursor-pointer text-left group"
          >
            <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="size-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.43 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.43l4.03-3.14z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#171730]">Google Calendar</p>
              <p className="text-[11px] text-[#8e8ea6]">Sync to Google account</p>
            </div>
          </button>

          {/* 2. Apple Calendar */}
          <button
            type="button"
            onClick={() => downloadIcsFile(session, `${session.slug || session.id}-apple.ics`)}
            className="flex items-center gap-3 rounded-xl border border-[#e5e5ed] p-3 hover:border-[#7c2ae8] hover:bg-[#faf7ff] transition cursor-pointer text-left group"
          >
            <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs group-hover:scale-105 transition-transform">
              <div className="flex flex-col items-center justify-center w-5.5 h-5.5 rounded overflow-hidden border border-[#d1d1db]">
                <div className="w-full bg-[#ef4444] h-1.5" />
                <div className="w-full bg-white flex items-center justify-center text-[9px] font-bold text-[#171730] leading-none pt-0.5">
                  {formattedDay}
                </div>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#171730]">Apple Calendar</p>
              <p className="text-[11px] text-[#8e8ea6]">Direct iCal for Apple</p>
            </div>
          </button>

          {/* 3. Microsoft Outlook */}
          <button
            type="button"
            onClick={() => window.open(generateOutlookCalendarUrl(session), "_blank")}
            className="flex items-center gap-3 rounded-xl border border-[#e5e5ed] p-3 hover:border-[#7c2ae8] hover:bg-[#faf7ff] transition cursor-pointer text-left group"
          >
            <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs group-hover:scale-105 transition-transform">
              <div className="grid size-5.5 place-items-center rounded bg-[#0078d4] text-[10px] font-black text-white leading-none shadow-2xs">
                O
              </div>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#171730]">Outlook / M365</p>
              <p className="text-[11px] text-[#8e8ea6]">Live & Office 365</p>
            </div>
          </button>

          {/* 4. Universal .ics */}
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="flex items-center gap-3 rounded-xl border border-[#e5e5ed] p-3 hover:border-[#7c2ae8] hover:bg-[#faf7ff] transition cursor-pointer text-left group"
          >
            <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs text-[#7c2ae8] group-hover:scale-105 transition-transform">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#171730]">Download .ics</p>
              <p className="text-[11px] text-[#8e8ea6]">RFC 5545 Universal file</p>
            </div>
          </button>
        </div>

        {/* Action Row: Copy Details & Join Live */}
        <div className="mt-6 pt-5 border-t border-[#f0ebf8] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="text-[12px] font-semibold text-[#7c2ae8] hover:text-[#5815b0] transition cursor-pointer flex items-center gap-1.5"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copied ? "Copied Details! ✓" : "Copy Event Details"}</span>
          </button>

          <Link
            href="/module"
            className="w-full sm:w-auto text-center rounded-xl bg-[#171730] px-5 py-2.5 text-[12.5px] font-bold text-white shadow-md hover:bg-[#281b4d] active:scale-[0.99] transition cursor-pointer"
          >
            Enter Session Stage →
          </Link>
        </div>

        {/* Other Cohort Sessions Switcher */}
        <div className="mt-8 pt-5 border-t border-[#eee8f8]">
          <p className="text-[11px] font-bold text-[#8e8ea6] uppercase tracking-wider mb-2.5">
            Switch Cohort Session
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COHORT_SESSIONS_CATALOG.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setOverrideSessionId(s.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                  session.id === s.id
                    ? "bg-[#7c2ae8] text-white shadow-2xs font-bold"
                    : "bg-[#f5f4fa] text-[#5b5b78] hover:bg-[#eae8f4] hover:text-[#171730]"
                }`}
              >
                {s.weekLabel || s.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
