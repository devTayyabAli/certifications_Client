// Date/time helpers. Live sessions are shown in the viewer's own time zone, named,
// with US Eastern time alongside for reference.

export const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** "Oct 15" */
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** "Thu, Oct 15, 5:00 PM GMT+1", in the viewer's time zone (named, so it's clear which) */
export const dayTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

/** "5:00 PM" */
export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** "Thu, Oct 15 · 5:00 PM – 6:00 PM" */
export const sessionRange = (start: string, end: string) =>
  `${new Date(start).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })} · ${time(start)} – ${time(end)}`;

/** "in 3 days", "in 5 hours" relative to current clock. */
export function timeUntil(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.round(ms / 3600e3);
  if (h < 1) return 'in under an hour';
  if (h < 48) return `in ${h} hour${h === 1 ? '' : 's'}`;
  const d = Math.round(h / 24);
  return `in ${d} days`;
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const firstName = (name?: string | null) =>
  (name || '').trim().split(/\s+/)[0] || 'there';

/** Sentence case for ALL-CAPS labels that arrive from content (e.g. "GET STARTED · SI HER DEFI"),
 *  keeping brand names intact. Mixed-case strings are returned unchanged. */
/** Brand names keep their own casing whatever case the rest of the text is in. */
function brandCase(s: string): string {
  return s
    .replace(/si her defi/gi, 'Si Her DeFi')
    .replace(/si<3>/gi, 'SI<3>')
    .replace(/\bdefi\b/gi, 'DeFi')
    .replace(/\bbase\b/gi, 'Base');
}

/**
 * Title case for short labels like partner tags: "SOCIAL IMPACT" → "Social Impact",
 * "DEFI SECURITY" → "DeFi Security", "web3 payments" → "Web3 Payments". Text typed in
 * mixed case in the CMS (e.g. "Self-custody") is kept exactly as written.
 */
export function titleCase(s?: string | null): string {
  if (!s) return '';
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) return s;
  return brandCase(s.toLowerCase().replace(/(^|[\s/&-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase()));
}

export function tagCase(s?: string | null): string {
  if (!s) return '';
  if (/[a-z]/.test(s)) return s;
  const lower = s.toLowerCase();
  const out = lower.charAt(0).toUpperCase() + lower.slice(1);
  return out
    .replace(/si her defi/gi, 'Si Her DeFi')
    .replace(/si<3>/gi, 'SI<3>')
    .replace(/\bdefi\b/gi, 'DeFi')
    .replace(/\bbase\b/gi, 'Base')
    .replace(/\b(et|pm|am)\b/g, (m) => m.toUpperCase());
}

/** A session's time, always in one format from its start/end (not the CMS's free-text dateLabel):
 *  { month: 'Oct', day: '15', weekday: 'Thursday', time: '12:00–1:00 PM ET' } in US Eastern time. */
/**
 * A session's date and time in the viewer's own time zone, named (e.g.
 * "5:00–6:00 PM GMT+1"), with the US Eastern time alongside for reference.
 * Learners join from many countries, and the gap to ET changes when US
 * daylight saving ends mid-cohort, so nobody should have to convert by hand.
 */
export function sessionWhen(start: string, end?: string) {
  const s = new Date(start);
  const part = (o: Intl.DateTimeFormatOptions, d = s, timeZone?: string) =>
    new Intl.DateTimeFormat('en-US', { timeZone, ...o }).format(d);
  const range = (timeZone?: string) => {
    const clock = (d: Date) => part({ hour: 'numeric', minute: '2-digit', hour12: true }, d, timeZone);
    const from = clock(s);
    const to = end ? clock(new Date(end)) : '';
    // "12:00 PM–1:00 PM" → "12:00–1:00 PM" when both share AM/PM
    return to ? (from.slice(-2) === to.slice(-2) ? `${from.slice(0, -3)}–${to}` : `${from}–${to}`) : from;
  };
  const local = range();
  const eastern = range('America/New_York');
  const dayOf = (timeZone?: string) => part({ year: 'numeric', month: 'numeric', day: 'numeric' }, s, timeZone);
  const sameDay = dayOf() === dayOf('America/New_York');
  // When ET falls on another date ("Fri 2 AM" here is "Thu 9 PM" in New York), say which day
  const etDay = sameDay ? '' : `${part({ weekday: 'short' }, s, 'America/New_York')} `;
  return {
    month: part({ month: 'short' }),
    day: part({ day: 'numeric' }),
    weekday: part({ weekday: 'long' }),
    /** in the viewer's time zone, e.g. "5:00–6:00 PM GMT+1" */
    time: `${local} ${zoneName(s)}`,
    /** the same session in US Eastern time, e.g. "12:00–1:00 PM ET" */
    et: `${etDay}${eastern} ET`,
    /** the viewer is on US Eastern time already: no need to show ET twice */
    sameAsEt: local === eastern && sameDay,
  };
}

/** The viewer's time zone as a short name at that moment: "EDT", "GMT+1", "GMT+5". */
export function zoneName(at: Date = new Date()): string {
  return (
    new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? ''
  );
}
