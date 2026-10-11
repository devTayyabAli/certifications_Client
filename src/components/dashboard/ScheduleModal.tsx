'use client';
// "Add to calendar" dialog
import { useEffect, useState } from 'react';
import { modulesApi, type ModuleItem } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { sessionRange, tz } from '@/lib/format';
import { Check } from '@/components/ui/Check';

type Provider = 'google' | 'apple' | 'outlook' | 'proton' | 'other';
const CTA: Record<Provider, string> = {
  google: 'Add to Google Calendar',
  apple: 'Add to Apple Calendar',
  outlook: 'Add to Outlook',
  proton: 'Add to Proton Calendar',
  other: 'Download .ics file',
};

const stamp = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function icsFile(m: ModuleItem) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Si Her DeFi//EN',
    'BEGIN:VEVENT',
    `UID:${m.slug}@siherdefi`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(m.scheduledDate || new Date().toISOString())}`,
    `DTEND:${stamp(m.endDate || new Date().toISOString())}`,
    `SUMMARY:${m.title} — Si Her DeFi`,
    `DESCRIPTION:${m.description}`,
    `LOCATION:${m.liveLink || m.location}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

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

export function ScheduleModal({
  module: m,
  onClose,
  onScheduled,
}: {
  module: ModuleItem;
  onClose: () => void;
  onScheduled?: (m: ModuleItem) => void;
}) {
  const [provider, setProvider] = useState<Provider>('google');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const details = `${m.title} — Si Her DeFi\n${m.dateLabel}\n${m.liveLink || m.location}`;

  const add = async () => {
    setBusy(true);
    try {
      await modulesApi.schedule(m.slug, provider);
      if (provider === 'google') {
        const start = m.scheduledDate ? stamp(m.scheduledDate) : '';
        const end = m.endDate ? stamp(m.endDate) : '';
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
          `${m.title} — Si Her DeFi`
        )}&dates=${start}/${end}&details=${encodeURIComponent(
          m.description
        )}&location=${encodeURIComponent(m.liveLink || m.location || '')}`;
        window.open(url, '_blank', 'noopener');
      } else {
        const blob = new Blob([icsFile(m)], { type: 'text/calendar' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${m.slug}.ics`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      onScheduled?.(m);
      onClose();
    } catch (e) {
      console.error('Schedule error:', e);
    } finally {
      setBusy(false);
    }
  };

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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f2eafd] px-2.5 py-0.5 text-[10.5px] font-medium text-[#7c2ae8] mb-2">
            <span>📅</span>
            <span>{m.dateLabel}</span>
          </div>
          <h2 id="schedule-modal-title" className="text-[17.5px] font-medium text-[#171730] leading-snug">
            {m.title}
          </h2>
          {m.scheduledDate && (
            <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[#171730]">
              <span aria-hidden="true">🕔</span>
              {sessionRange(m.scheduledDate, m.endDate || m.scheduledDate)}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-[#8e8ea6]">Shown in your time zone ({tz()})</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#5f5f7a]">
            Add this live cohort session to your calendar. You’ll get a reminder 15 minutes before it starts.
          </p>
        </div>
        <div className="mt-4.5 space-y-2.5">
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
            body="End-to-end encrypted calendar by Proton"
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
            onClick={async () => {
              await navigator.clipboard?.writeText(details).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#7c2ae8] hover:text-[#5e19b5] transition cursor-pointer"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copied ? <span className="inline-flex items-center gap-1.5">Copied <Check className="size-4" /></span> : 'Copy event details to clipboard'}</span>
          </button>
        </div>
        <div className="mt-4 space-y-2.5">
          <Button loading={busy} loadingLabel="Adding…" showIcon={false} onClick={add}>
            {CTA[provider]}
          </Button>
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
