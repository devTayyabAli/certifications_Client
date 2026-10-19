'use client';
// "Add to calendar" dialog
import { useEffect, useState } from 'react';
import { modulesApi, type ModuleItem } from '@/lib/api';
import type { CohortEvent } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { sessionRange, tz } from '@/lib/format';
import { Check } from '@/components/ui/Check';
import {
  copyEventDetails,
  downloadIcsFile,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  moduleIcsUrl,
  eventToSessionData,
  moduleToSessionData,
  PROTON_CALENDAR_URL,
} from '@/lib/calendar';

type Provider = 'email' | 'google' | 'apple' | 'outlook' | 'proton' | 'other';
const CTA: Record<Provider, string> = {
  email: 'Email me the invite',
  google: 'Add to Google Calendar',
  apple: 'Add to Apple Calendar',
  outlook: 'Add to Outlook',
  proton: 'Add to Proton Calendar',
  other: 'Download .ics file',
};

function Option({
  id,
  selected,
  onSelect,
  icon,
  title,
  body,
  badge,
}: {
  id: Provider;
  selected: boolean;
  onSelect: (p: Provider) => void;
  icon: React.ReactNode;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <div
      onClick={() => onSelect(id)}
      className={`flex items-center justify-between rounded-xl border p-3.5 transition cursor-pointer select-none ${
        selected
          ? 'border-[#7c2ae8] bg-[#faf7ff] ring-1 ring-[#7c2ae8]'
          : 'border-[#e5e5ed] bg-white hover:border-[#cfcfdb] hover:bg-[#fafafc]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-white border border-[#ececf2] shadow-2xs">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-medium text-[#171730]">{title}</p>
            {badge && (
              <span className="rounded-full bg-[#f2eafd] px-1.5 py-0.2 text-[9.5px] font-medium text-[#7c2ae8]">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#8e8ea6]">{body}</p>
        </div>
      </div>
      <div
        className={`grid size-4.5 place-items-center rounded-full border transition ${
          selected ? 'border-[#7c2ae8] bg-[#7c2ae8]' : 'border-[#cfcfdb] bg-white'
        }`}
      >
        {selected && <div className="size-1.5 rounded-full bg-white" />}
      </div>
    </div>
  );
}

/**
 * "Add to calendar" for a live session (`module`) or a cohort event such as a
 * LinkedIn Live (`event`). Sessions are also remembered in the database ("Added
 * to calendar" on every device); events just go to the chosen calendar.
 */
export function ScheduleModal({
  module,
  event,
  onClose,
  onScheduled,
}: {
  module?: ModuleItem;
  event?: CohortEvent;
  onClose: () => void;
  onScheduled?: (m: ModuleItem) => void;
}) {
  const m = module ?? null;
  // what the dialog shows, the same for either kind
  const view = m
    ? {
        title: m.title,
        start: m.scheduledDate,
        end: m.endDate,
        link: m.liveLink,
        linkLabel: 'Ro.am link',
        file: m.slug,
        intro: 'Add this live cohort session to your calendar. You’ll get reminders 24 hours and 1 hour before it starts.',
        copyLabel: 'Copy module details to clipboard',
      }
    : {
        title: event!.title,
        start: event!.date,
        end: event!.endDate ?? null,
        link: event!.linkIsPlaceholder ? null : event!.link,
        linkLabel: event!.kind === 'linkedin-live' ? 'LinkedIn' : 'Event link',
        file: event!.id.startsWith('event-') ? event!.id : `event-${event!.id}`,
        intro: `Add this ${event!.kind === 'linkedin-live' ? 'LinkedIn Live' : 'event'} to your calendar. You’ll get reminders 24 hours and 1 hour before it starts.`,
        copyLabel: 'Copy event details to clipboard',
      };
  // reopening a session already added starts on the calendar the learner used;
  // a session (not an event) starts on the emailed invite, which keeps itself up to date
  const [provider, setProvider] = useState<Provider>(m?.scheduledProvider ?? (m ? 'email' : 'google'));
  const [busy, setBusy] = useState(false);
  // the invite went out: the dialog says where, instead of closing
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const sessionData = m ? moduleToSessionData(m) : eventToSessionData(event!);

  const handleCopy = async () => {
    const success = await copyEventDetails(sessionData);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /** Hands the event to the chosen calendar. Runs straight from the click, before
   *  any network call, so browsers don't treat the new tab as a blocked pop-up. */
  const openInCalendar = () => {
    if (provider === 'google') {
      window.open(generateGoogleCalendarUrl(sessionData), '_blank', 'noopener');
    } else if (provider === 'outlook') {
      window.open(generateOutlookCalendarUrl(sessionData), '_blank', 'noopener');
    } else if (provider === 'proton') {
      window.open(PROTON_CALENDAR_URL, '_blank', 'noopener');
      downloadIcsFile(sessionData, `${view.file}-proton.ics`);
    } else if (provider === 'apple') {
      const url = moduleIcsUrl(sessionData);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        downloadIcsFile(sessionData, `${view.file}-apple.ics`);
      }
    } else {
      downloadIcsFile(sessionData, `${view.file}.ics`);
    }
  };

  const add = async () => {
    setError(null);
    if (provider === 'email' && m) {
      setBusy(true);
      try {
        const r = await modulesApi.invite(m.slug);
        setSentTo(r.sentTo);
        onScheduled?.(m);
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : 'We couldn’t send the invite. Please try again.');
      } finally {
        setBusy(false);
      }
      return;
    }
    openInCalendar();
    // events aren't tracked per learner: once the calendar has it, done
    if (!m) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      // remembered in the database, so "Added to calendar" shows on every device
      await modulesApi.schedule(m.slug, provider === 'email' ? 'other' : provider);
      onScheduled?.(m);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? `${e.message} The event was still sent to your calendar.`
          : 'We couldn’t save this to your sessions, but the event was still sent to your calendar.'
      );
    } finally {
      setBusy(false);
    }
  };

  /** Clears "Added to calendar" in the app. The learner removes the event from their own calendar. */
  const remove = async () => {
    if (!m) return;
    setError(null);
    setRemoving(true);
    try {
      await modulesApi.unschedule(m.slug);
      onScheduled?.(m);
      onClose();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  if (sentTo) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl border border-[#ececf2] text-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-sent-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto grid size-11 place-items-center rounded-full bg-[#f0fdf4] text-[#16a34a]">
            <Check className="size-5" />
          </div>
          <h2 id="invite-sent-title" className="mt-3 text-[17px] font-medium text-[#171730]">
            Invite sent
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#5f5f7a]">
            We emailed a calendar invite for <span className="font-medium text-[#171730]">{view.title}</span> to{' '}
            <span className="font-medium text-[#171730] break-all">{sentTo}</span>. Open it and tap{' '}
            <strong>Accept</strong> (or <strong>Yes</strong>) to add it to your calendar.
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-[#8e8ea6]">
            If the time or link changes, you’ll get an update that changes the event in your calendar. Not
            there in a few minutes? Check your spam folder.
          </p>
          <div className="mt-5">
            <Button showIcon={false} onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[460px] max-h-[92vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-[#ececf2]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 grid size-7 place-items-center rounded-full text-[#8e8ea6] hover:bg-gray-100 hover:text-[#171730] transition cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="pr-6">
          <h2 id="schedule-modal-title" className="text-[17.5px] font-medium text-[#171730] leading-snug">
            {view.title}
          </h2>
          {view.start && (
            <p className="mt-2 text-[12.5px] font-medium text-[#171730]">
              {sessionRange(view.start, view.end || view.start)}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-[#8e8ea6]">Shown in your time zone ({tz()})</p>
          {m?.calendarOutdated ? (
            <p role="status" className="mt-2.5 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] leading-relaxed text-[#92400e]">
              This session has moved since you added it. Add it again so your calendar has the new time,
              then remove the old event from your calendar.
            </p>
          ) : (
            <p className="mt-2 text-[12px] leading-relaxed text-[#5f5f7a]">
              {view.intro}
            </p>
          )}
          {view.link ? (
            <p className="mt-2.5 flex min-w-0 items-center gap-1.5 rounded-lg border border-[#e4e4ed] bg-[#f9fafc] px-2.5 py-1.5 text-[11px] text-[#5f5f7a]">
              <span className="shrink-0 font-medium text-[#7c2ae8]">{view.linkLabel}</span>
              <a
                href={view.link}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-[#171730] underline-offset-2 hover:text-[#7c2ae8] hover:underline"
              >
                {view.link}
              </a>
            </p>
          ) : null}
        </div>
        <div className="mt-4.5 space-y-2.5">
          {m && (
            <Option
              id="email"
              selected={provider === 'email'}
              onSelect={setProvider}
              title="Email me an invite"
              badge="Recommended"
              body="Tap Accept in the email and it’s in your calendar (Proton, Gmail, Outlook, Apple). Changes update it automatically."
              icon={
                <svg className="size-5 text-[#7c2ae8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
          )}
          <Option
            id="google"
            selected={provider === 'google'}
            onSelect={setProvider}
            title="Google Calendar"
            body="Sync event to personal or corporate Google account"
            icon={
              <svg className="size-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.43 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.43l4.03-3.14z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
              </svg>
            }
          />
          <Option
            id="apple"
            selected={provider === 'apple'}
            onSelect={setProvider}
            title="Apple Calendar / iOS"
            body="Direct sync for Mac, iPhone, and iPad"
            icon={
              <div className="flex flex-col items-center justify-center w-5.5 h-5.5 rounded overflow-hidden border border-[#d1d1db]">
                <div className="w-full bg-[#ef4444] h-1.5" />
                <div className="w-full bg-white flex items-center justify-center text-[9px] font-medium text-[#171730] leading-none pt-0.5">15</div>
              </div>
            }
          />
          <Option
            id="outlook"
            selected={provider === 'outlook'}
            onSelect={setProvider}
            title="Microsoft Outlook"
            body="Outlook.com, Live, and Microsoft 365 accounts"
            icon={
              <div className="grid size-5.5 place-items-center rounded bg-[#0078d4] text-[10px] font-medium text-white leading-none shadow-2xs">O</div>
            }
          />
          <Option
            id="proton"
            selected={provider === 'proton'}
            onSelect={setProvider}
            title="Proton Calendar"
            body={m ? 'Imports a file. Easier: “Email me an invite” above.' : 'End-to-end encrypted calendar by Proton'}
            icon={
              <div className="grid size-5.5 place-items-center rounded bg-gradient-to-br from-[#6d4aff] to-[#a995ff] text-[10px] font-medium text-white leading-none shadow-2xs">P</div>
            }
          />
          <Option
            id="other"
            selected={provider === 'other'}
            onSelect={setProvider}
            title="Universal .ics / Other"
            badge="RFC 5545"
            body="Standard .ics for Thunderbird, CalDAV, and desktop apps"
            icon={
              <svg className="size-5 text-[#7c2ae8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            }
          />
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#7c2ae8] hover:text-[#5e19b5] transition cursor-pointer"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copied ? <span className="inline-flex items-center gap-1.5">Copied <Check className="size-4" /></span> : view.copyLabel}</span>
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[12px] leading-relaxed text-red-500">
            {error}
          </p>
        )}
        <div className="mt-4 space-y-2.5">
          <Button loading={busy} loadingLabel="Adding…" disabled={removing} showIcon={false} onClick={add}>
            {CTA[provider]}
          </Button>
          {(m?.isScheduled || m?.calendarOutdated) && (
            <button
              type="button"
              onClick={remove}
              disabled={busy || removing}
              className="w-full cursor-pointer py-1 text-center text-[12px] font-medium text-[#8e8ea6] transition hover:text-[#b91c1c] disabled:opacity-50"
            >
              {removing
                ? 'Removing…'
                : m?.scheduledProvider === 'email'
                  ? 'Remove and cancel the invite'
                  : 'Mark as not added'}
            </button>
          )}
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
