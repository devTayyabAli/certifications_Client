'use client';
// "Subscribe to the cohort calendar": one private link that keeps every session
// and LinkedIn Live in the learner's own calendar, updating when times or
// Ro.am links change.
import { useEffect, useState } from 'react';
import { calendarFeedApi, type CalendarFeedLinks } from '@/lib/api';

const option =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-[12.5px] font-medium text-[#151534] transition hover:border-[#d4c2f5] hover:text-[#7c2ae8]';

export function SubscribeCard() {
  const [links, setLinks] = useState<CalendarFeedLinks | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  useEffect(() => {
    calendarFeedApi.getLinks().then(setLinks).catch(() => setFailed(true));
  }, []);

  const copy = async () => {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard blocked: show the link to copy by hand
      setShowUrl(true);
    }
  };

  if (failed) return null;

  return (
    <section className="rounded-2xl border border-[#ececf2] bg-white p-4 sm:p-5" aria-labelledby="subscribe-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 id="subscribe-title" className="text-[15px] font-medium text-[#151534]">
            Add every session to your calendar
          </h2>
          <p className="mt-1 max-w-[520px] text-[12.5px] leading-5 text-[#5f5f7a]">
            Subscribe once and all sessions and LinkedIn Lives appear in your calendar, in your time zone. If a time or
            Ro.am link changes, your calendar updates on its own.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-busy={!links}>
          <a className={option} href={links?.googleUrl} target="_blank" rel="noopener noreferrer" aria-disabled={!links}>
            Google
          </a>
          <a className={option} href={links?.webcalUrl} aria-disabled={!links}>
            Apple
          </a>
          <a className={option} href={links?.outlookUrl} target="_blank" rel="noopener noreferrer" aria-disabled={!links}>
            Outlook
          </a>
          <button type="button" onClick={copy} disabled={!links} className={`${option} cursor-pointer disabled:opacity-50`}>
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      </div>
      {showUrl && links && (
        <input
          readOnly
          value={links.url}
          aria-label="Your calendar link"
          onFocus={(e) => e.currentTarget.select()}
          className="mt-3 w-full rounded-lg border border-[#e2e2ec] bg-[#fafafc] px-3 py-2 font-mono text-[11.5px] text-[#45465f]"
        />
      )}
      <p className="mt-3 border-t border-[#f0f0f5] pt-3 text-[11.5px] leading-5 text-[#8e8ea6]">
        <span className="font-medium text-[#5f5f7a]">Proton Calendar:</span> copy the link, then in Proton go to
        Settings → Calendars → Add calendar from URL. This link is personal to you; please don’t share it.
      </p>
    </section>
  );
}
