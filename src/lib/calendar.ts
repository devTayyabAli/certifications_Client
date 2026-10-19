/**
 * Frontend Calendar Utilities for Si Her DeFi Dapp & Reminder Integrations.
 * Generates RFC 5545 compliant iCalendar (.ics) files, Google Calendar URLs,
 * and Outlook Calendar URLs strictly matching backend calendarService.
 */

import { API_BASE_URL } from "@/lib/api";
import { BASE_PATH } from "@/lib/constants";

export interface SessionData {
  id: string;
  slug?: string;
  title: string;
  weekLabel?: string;
  dateLabel?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  location?: string;
  description?: string;
  meetingUrl?: string;
  presenter?: string;
  timezone?: string;
}

/** The session's page in this app, for "more details" links in calendar events. */
export function sessionPageUrl(session: SessionData): string | undefined {
  if (!session.slug || typeof window === "undefined") return undefined;
  return `${window.location.origin}${BASE_PATH}/module/${encodeURIComponent(session.slug)}`;
}

/**
 * The server's .ics for a module. Served as text/calendar, so iPhone / iPad /
 * Mac open it straight in the Calendar app; elsewhere it downloads.
 */
export function moduleIcsUrl(session: SessionData): string | undefined {
  if (!session.slug) return undefined;
  return `${API_BASE_URL}/modules/${encodeURIComponent(session.slug)}/calendar/ics`;
}

/**
 * Proton Calendar has no "pre-filled event" link like Google's, so a session
 * is added by importing its .ics there (Settings → Import/export).
 */
export const PROTON_CALENDAR_URL = "https://calendar.proton.me";

/** The learner's own time zone name, e.g. "Asia/Karachi". */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
  } catch {
    return "local time";
  }
}

/** "Thu, Oct 22 · 10:00 PM – 11:00 PM" in the learner's time zone. */
export function formatSessionWindow(session: SessionData): string {
  const { start, end } = parseSessionDates(session);
  const day = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time(start)} – ${time(end)}`;
}

/** Event body: the session description, the join link and the session page. */
function eventDetails(session: SessionData, joinLabel: string): string {
  const meetingUrl = sanitizeCalendarUrl(session.meetingUrl);
  const pageUrl = sessionPageUrl(session);
  const isRoam = meetingUrl?.includes("ro.am");
  const meetingLabel = isRoam ? "Roam Session Link" : joinLabel;
  return [
    session.description || "Si Her DeFi Cohort Learning Session",
    session.presenter ? `Presented by: ${session.presenter}` : "",
    meetingUrl ? `${meetingLabel}: ${meetingUrl}` : "",
    pageUrl ? `Session page: ${pageUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Validate and sanitize URL (prevent javascript: or data: injection and null/undefined values)
 */
export function sanitizeCalendarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (
    trimmed === "" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined" ||
    trimmed.toLowerCase().startsWith("javascript:") ||
    trimmed.toLowerCase().startsWith("data:") ||
    trimmed.toLowerCase().startsWith("vbscript:")
  ) {
    return undefined;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return undefined;
  } catch {
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return trimmed;
    }
    return undefined;
  }
}

/**
 * Ensure valid Date objects for start and end times
 */
export function parseSessionDates(session: SessionData): { start: Date; end: Date } {
  const start = session.startDate
    ? new Date(session.startDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const validStart = !isNaN(start.getTime())
    ? start
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  let end: Date;
  if (session.endDate) {
    const parsedEnd = new Date(session.endDate);
    end = !isNaN(parsedEnd.getTime()) ? parsedEnd : new Date(validStart.getTime() + 60 * 60 * 1000);
  } else {
    end = new Date(validStart.getTime() + 60 * 60 * 1000);
  }

  return { start: validStart, end };
}

/**
 * Format a Date to UTC ISO compact string (YYYYMMDDTHHMMSSZ) for standard calendar interoperability
 */
export function formatCalendarUtcDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape text per RFC 5545 Section 3.3.11
 */
export function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold lines longer than 75 characters per RFC 5545 Section 3.1
 */
export function foldIcsLine(line: string, maxLen = 75): string {
  if (line.length <= maxLen) return line;
  const chunks: string[] = [];
  let current = line;

  chunks.push(current.substring(0, maxLen));
  current = current.substring(maxLen);

  while (current.length > maxLen - 1) {
    chunks.push(` ${current.substring(0, maxLen - 1)}`);
    current = current.substring(maxLen - 1);
  }
  if (current.length > 0) {
    chunks.push(` ${current}`);
  }

  return chunks.join("\r\n");
}

/**
 * Generate RFC 5545 .ics content (matching backend CalendarService)
 */
export function generateIcsContent(session: SessionData): string {
  const { start, end } = parseSessionDates(session);
  const uid = `siherdefi-${session.slug || session.id || Date.now()}@siherdefi.org`;
  const dtStamp = formatCalendarUtcDate(new Date());
  const dtStart = formatCalendarUtcDate(start);
  const dtEnd = formatCalendarUtcDate(end);
  const timezone = session.timezone || "UTC";

  const eventTitle = session.title.startsWith("Si Her DeFi")
    ? session.title
    : `Si Her DeFi: ${session.title}`;

  const meetingUrl = sanitizeCalendarUrl(session.meetingUrl);
  const pageUrl = sessionPageUrl(session);
  const primaryUrl = meetingUrl ?? pageUrl;
  const isRoam = meetingUrl?.includes("ro.am");

  const summary = escapeIcsText(eventTitle);
  const description = escapeIcsText(eventDetails(session, isRoam ? "Roam Session Link" : "Session Meeting Link"));
  const location = escapeIcsText(
    meetingUrl
      ? `${session.location || "Si Her DeFi Virtual Stage"} (${meetingUrl})`
      : session.location || "Si Her DeFi Virtual Stage"
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Si Her DeFi//Cohort Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Si Her DeFi Sessions",
    `X-WR-TIMEZONE:${timezone}`,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    ...(primaryUrl ? [`URL:${primaryUrl}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "SEQUENCE:0",
    // reminders a day and an hour before
    ...["-P1D", "-PT1H"].flatMap((t) => [
      "BEGIN:VALARM",
      `TRIGGER:${t}`,
      "ACTION:DISPLAY",
      `DESCRIPTION:Reminder: ${summary}`,
      "END:VALARM",
    ]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map((l) => foldIcsLine(l)).join("\r\n");
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(session: SessionData): string {
  const { start, end } = parseSessionDates(session);
  const eventTitle = session.title.startsWith("Si Her DeFi")
    ? session.title
    : `Si Her DeFi: ${session.title}`;

  const isRoam = session.meetingUrl?.includes("ro.am");
  const joinLabel = isRoam ? "Join Roam Session" : "Join Session";
  const fullDescription = eventDetails(session, joinLabel);

  const locationStr = session.meetingUrl
    ? `${session.location || "Si Her DeFi Virtual Stage"} (${session.meetingUrl})`
    : session.location || "Si Her DeFi Virtual Stage";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle,
    dates: `${formatCalendarUtcDate(start)}/${formatCalendarUtcDate(end)}`,
    details: fullDescription,
    location: locationStr,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Live / Hotmail Web URL
 */
export function generateOutlookCalendarUrl(session: SessionData): string {
  const { start, end } = parseSessionDates(session);
  const eventTitle = session.title.startsWith("Si Her DeFi")
    ? session.title
    : `Si Her DeFi: ${session.title}`;

  const isRoam = session.meetingUrl?.includes("ro.am");
  const joinLabel = isRoam ? "Join Roam Session" : "Join Session";
  const fullDescription = eventDetails(session, joinLabel);

  const locationStr = session.meetingUrl
    ? `${session.location || "Si Her DeFi Virtual Stage"} (${session.meetingUrl})`
    : session.location || "Si Her DeFi Virtual Stage";

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: eventTitle,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: fullDescription,
    location: locationStr,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Microsoft Office 365 Calendar URL
 */
export function generateOffice365CalendarUrl(session: SessionData): string {
  const { start, end } = parseSessionDates(session);
  const eventTitle = session.title.startsWith("Si Her DeFi")
    ? session.title
    : `Si Her DeFi: ${session.title}`;

  const isRoam = session.meetingUrl?.includes("ro.am");
  const joinLabel = isRoam ? "Join Roam Session" : "Join Session";
  const fullDescription = eventDetails(session, joinLabel);

  const locationStr = session.meetingUrl
    ? `${session.location || "Si Her DeFi Virtual Stage"} (${session.meetingUrl})`
    : session.location || "Si Her DeFi Virtual Stage";

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: eventTitle,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: fullDescription,
    location: locationStr,
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Download standard RFC 5545 .ics file
 */
export function downloadIcsFile(session: SessionData, customFilename?: string): void {
  const ics = generateIcsContent(session);
  const filename = customFilename || `${session.slug || session.id || "session"}.ics`;

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename.endsWith(".ics") ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * Copy formatted event details to clipboard
 */
export async function copyEventDetails(session: SessionData): Promise<boolean> {
  const { start, end } = parseSessionDates(session);

  const dateStr = start.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = `${start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;

  const meetingUrl = sanitizeCalendarUrl(session.meetingUrl);
  const isRoam = meetingUrl?.includes("ro.am");
  const roamLabel = isRoam ? "🔗 Roam Session Link" : "🔗 Join Session Link";

  const text = [
    `Si Her DeFi: ${session.title}`,
    `📅 Date: ${dateStr}`,
    `⏰ Time: ${timeStr} (${localTimeZone()})`,
    `📍 Location: ${session.location || "Si Her DeFi Virtual Stage"}`,
    session.presenter ? `🎙️ Presenter: ${session.presenter}` : "",
    meetingUrl
      ? `${roamLabel}: ${meetingUrl}`
      : sessionPageUrl(session)
        ? `🔗 Roam Session Link: Available at session page before start`
        : "",
    sessionPageUrl(session) ? `🌐 Session page: ${sessionPageUrl(session)}` : "",
    session.description ? `\nℹ️ Description:\n${session.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Convert a backend ModuleItem or prototype Module to SessionData
 */
export function moduleToSessionData(m: {
  id?: string;
  slug?: string;
  title: string;
  week?: number;
  dateLabel?: string;
  scheduledDate?: string | Date | null;
  endDate?: string | Date | null;
  location?: string;
  description?: string;
  liveLink?: string | null;
  meetingUrl?: string | null;
  presenter?: string;
  speakers?: Array<{ name: string; companyName?: string }>;
}): SessionData {
  const speakerNames = m.speakers?.length
    ? m.speakers.map((s) => s.name).join(", ")
    : m.presenter || "";

  return {
    id: m.id || m.slug || "session",
    slug: m.slug,
    title: m.title,
    dateLabel: m.dateLabel,
    startDate: m.scheduledDate || undefined,
    endDate: m.endDate || undefined,
    location: m.location || "Si Her DeFi Virtual Stage",
    description: m.description,
    meetingUrl: m.liveLink || m.meetingUrl || undefined,
    presenter: speakerNames,
  };
}

/**
 * Convert a cohort event (e.g. a LinkedIn Live) to SessionData. Its own page
 * link goes in as the join link once it has one (not the placeholder company page).
 */
export function eventToSessionData(e: {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  date: string;
  endDate?: string;
  partnerName?: string;
  link: string;
  linkIsPlaceholder?: boolean;
}): SessionData {
  const live = e.kind === "linkedin-live";
  return {
    id: e.id.startsWith("event-") ? e.id : `event-${e.id}`,
    title: live ? `${e.title} (LinkedIn Live)` : e.title,
    startDate: e.date,
    endDate: e.endDate,
    location: live ? "LinkedIn Live" : "Online",
    description: [e.subtitle, e.partnerName ? `With ${e.partnerName}` : ""].filter(Boolean).join("\n\n") || undefined,
    meetingUrl: e.linkIsPlaceholder ? undefined : e.link,
  };
}
