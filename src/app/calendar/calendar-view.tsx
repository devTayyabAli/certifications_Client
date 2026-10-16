"use client";

// Cohort calendar: a month grid of the live sessions and LinkedIn Lives, with
// month navigation and the chosen day's events. Everything comes from the API
// (modules + events); "Add to calendar" is stored per learner in the database.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { SubscribeCard } from "@/components/calendar/SubscribeCard";
import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";
import { useNow } from "@/lib/use-now";
import { ScheduleModal } from "@/components/dashboard/ScheduleModal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Check } from "@/components/ui/Check";
import { eventsApi, isAuthenticated, modulesApi, type ModuleItem } from "@/lib/api";
import { sessionWhen, tz } from "@/lib/format";
import type { CohortEvent } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Entry =
  | { kind: "session"; key: string; at: number; m: ModuleItem }
  | { kind: "event"; key: string; at: number; e: CohortEvent };

/**
 * "2026-11-05" for a moment, as a calendar date in the viewer's own time zone:
 * a session late in the US evening sits on the next day for learners further east.
 */
function dayKey(iso: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const keyOf = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;


const isDone = (m: ModuleItem) => !!m.quiz?.isPassed || !!m.quiz?.isSkipped;

export default function CalendarView() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [events, setEvents] = useState<CohortEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [viewState, setView] = useState<{ y: number; m: number } | null>(null);
  const [selectedState, setSelected] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<ModuleItem | null>(null);
  const [schedulingEvent, setSchedulingEvent] = useState<CohortEvent | null>(null);

  // bumped after "Add to calendar" so the sessions reload with their new state
  const [reloads, setReloads] = useState(0);
  const reload = useCallback(() => setReloads((n) => n + 1), []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    let alive = true;
    Promise.allSettled([modulesApi.getAll(), eventsApi.getAll()]).then(([m, e]) => {
      if (!alive) return;
      if (m.status === "fulfilled" && Array.isArray(m.value)) {
        setModules(m.value);
        setFailed(false);
      } else setFailed(true);
      if (e.status === "fulfilled" && Array.isArray(e.value)) setEvents(e.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [router, reloads]);

  const entries = useMemo<Entry[]>(
    () =>
      [
        ...modules
          .filter((m) => m.scheduledDate)
          .map((m) => ({ kind: "session" as const, key: dayKey(m.scheduledDate!), at: new Date(m.scheduledDate!).getTime(), m })),
        ...events.map((e) => ({ kind: "event" as const, key: dayKey(e.date), at: new Date(e.date).getTime(), e })),
      ].sort((a, b) => a.at - b.at),
    [modules, events]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const x of entries) map.set(x.key, [...(map.get(x.key) ?? []), x]);
    return map;
  }, [entries]);

  const todayKey = dayKey(new Date());

  if (loading) {
    return (
      <AppShell>
        <SkeletonPage label="Loading the calendar" className="mx-auto max-w-5xl space-y-6">
          <div className="space-y-2.5">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-full max-w-[560px]" />
          </div>
          <Skeleton className="h-[104px] rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* month grid */}
            <div className="space-y-4 rounded-2xl border border-[#ececf2] bg-white p-4 sm:p-5 lg:col-span-7">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-7 w-28" />
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }, (_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </div>
            {/* the chosen day's sessions */}
            <div className="space-y-3 lg:col-span-5">
              <Skeleton className="h-5 w-48" />
              {[0, 1].map((i) => (
                <div key={i} className="space-y-3 rounded-2xl border border-[#ececf2] bg-white p-4 sm:p-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                  <Skeleton className="h-10 w-40 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </SkeletonPage>
      </AppShell>
    );
  }

  // until the learner navigates: the month of the next session (or today), with that day picked
  const startKey = (entries.find((x) => x.key >= todayKey) ?? entries[entries.length - 1])?.key ?? todayKey;
  const [startY, startM] = startKey.split("-").map(Number);
  const view = viewState ?? { y: startY, m: startM - 1 };
  const selected = selectedState ?? startKey;

  const first = new Date(Date.UTC(view.y, view.m, 1));
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const monthPrefix = keyOf(view.y, view.m, 1).slice(0, 7);
  const inMonth = entries.filter((x) => x.key.startsWith(monthPrefix));
  const dayItems = selected ? byDay.get(selected) ?? [] : [];
  const selectedLabel = selected
    ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
        new Date(`${selected}T12:00:00Z`)
      )
    : "";

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(view.y, view.m + delta, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };
  const goToday = () => {
    const [y, mo] = todayKey.split("-").map(Number);
    setView({ y, m: mo - 1 });
    setSelected(todayKey);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1.5">
          <h1 className="text-[26px] font-medium leading-[1.15] tracking-[-0.02em] text-[#151534] sm:text-[30px]">Calendar</h1>
          <p className="text-[14px] leading-6 text-[#4c4d77]">
            Every live session and LinkedIn Live in the cohort, shown in your time zone ({tz()}), with US Eastern
            time alongside.
          </p>
        </header>

        <SubscribeCard />

        {failed && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-600">
            We couldn’t load the sessions. Please refresh the page.
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* month grid */}
          <section className="rounded-2xl border border-[#ececf2] bg-white p-4 sm:p-5 lg:col-span-7" aria-label="Month">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[16px] font-medium text-[#151534]" aria-live="polite">
                {monthLabel}
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goToday}
                  className="cursor-pointer rounded-lg border border-[#e2e2ec] px-2.5 py-1 text-[12px] font-medium text-[#45465f] transition hover:border-[#d4c2f5] hover:text-[#7c2ae8]"
                >
                  Today
                </button>
                {[
                  { d: -1, label: "Previous month", path: "M10 4l-4 4 4 4" },
                  { d: 1, label: "Next month", path: "M6 4l4 4-4 4" },
                ].map((b) => (
                  <button
                    key={b.d}
                    type="button"
                    onClick={() => shift(b.d)}
                    aria-label={b.label}
                    className="grid size-8 cursor-pointer place-items-center rounded-lg border border-[#e2e2ec] text-[#45465f] transition hover:border-[#d4c2f5] hover:text-[#7c2ae8]"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={b.path} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="pb-1 text-[11px] font-medium text-[#9a9cbd]">
                  {w}
                </div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`blank-${i}`} />;
                const key = keyOf(view.y, view.m, d);
                const items = byDay.get(key) ?? [];
                const isSel = key === selected;
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    aria-pressed={isSel}
                    aria-label={`${d}${items.length ? `, ${items.length} event${items.length > 1 ? "s" : ""}` : ""}`}
                    className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[13px] tabular-nums transition sm:aspect-auto sm:h-14 ${
                      isSel
                        ? "bg-gradient-to-b from-[#8b3df0] to-[#7c2ae8] font-medium text-white"
                        : items.length
                          ? "bg-[#f8f5fe] font-medium text-[#151534] hover:bg-[#f1eafd]"
                          : "text-[#45465f] hover:bg-[#f6f6fa]"
                    } ${isToday && !isSel ? "ring-1 ring-[#7c2ae8]" : ""}`}
                  >
                    <span>{d}</span>
                    {items.length > 0 && (
                      <span className="flex gap-0.5" aria-hidden="true">
                        {items.slice(0, 3).map((x) => (
                          <span
                            key={x.kind === "session" ? x.m.slug : x.e.id}
                            className={`size-1.5 rounded-full ${
                              isSel
                                ? "bg-white"
                                : x.kind === "event"
                                  ? "bg-[#0a66c2]"
                                  : isDone(x.m)
                                    ? "bg-[#16a34a]"
                                    : "bg-[#7c2ae8]"
                            }`}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#f0f0f6] pt-3 text-[11.5px] text-[#7e7e96]">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#7c2ae8]" />Live session</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#16a34a]" />Completed</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#0a66c2]" />LinkedIn Live</span>
              <span className="ml-auto">{inMonth.length} this month</span>
            </div>
          </section>

          {/* the chosen day */}
          <section className="space-y-3 lg:col-span-5" aria-label="Events on the selected day">
            <h2 className="text-[11.5px] font-medium text-[#9a9cbd]">{selectedLabel}</h2>
            {dayItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#e2e2ec] bg-white p-6 text-center">
                <p className="text-[13px] text-[#7e7e96]">Nothing scheduled this day.</p>
                {inMonth.some((x) => x.key > (selected ?? "")) && (
                  <button
                    type="button"
                    onClick={() => setSelected(inMonth.find((x) => x.key > (selected ?? ""))!.key)}
                    className="link-cta mt-2 text-[12.5px] font-medium text-[#7c2ae8]"
                  >
                    Go to the next session
                  </button>
                )}
              </div>
            ) : (
              dayItems.map((x) =>
                x.kind === "session" ? (
                  <SessionRow key={x.m.slug} m={x.m} onSchedule={setScheduling} />
                ) : (
                  <EventRow key={x.e.id} e={x.e} onSchedule={setSchedulingEvent} />
                )
              )
            )}
          </section>
        </div>

        {scheduling && (
          <ScheduleModal module={scheduling} onClose={() => setScheduling(null)} onScheduled={reload} />
        )}
        {schedulingEvent && <ScheduleModal event={schedulingEvent} onClose={() => setSchedulingEvent(null)} />}
      </div>
    </AppShell>
  );
}

function SessionRow({ m, onSchedule }: { m: ModuleItem; onSchedule: (m: ModuleItem) => void }) {
  const when = sessionWhen(m.scheduledDate!, m.endDate || undefined);
  const done = isDone(m);
  const upcoming = m.sessionState === "upcoming";
  return (
    <article className="space-y-3 rounded-2xl border border-[#ececf2] bg-white p-4 sm:p-5">
      <div>
        <p className={`text-[11.5px] font-medium ${done ? "text-[#16a34a]" : "text-[#7c2ae8]"}`}>
          {done ? "Completed" : m.sessionState === "live" ? "Live now" : upcoming ? "Live session" : "Recording"}
        </p>
        <h3 className="mt-0.5 text-[15px] font-medium text-[#151534]">{m.title}</h3>
        <p className="mt-1 text-[12.5px] text-[#5f5f7a]">
          <time dateTime={m.scheduledDate!}>{when.time}</time>
          {!when.sameAsEt && <span className="text-[#9a9cbd]"> · {when.et}</span>}
        </p>
        {m.presenter && (
          <p className="mt-0.5 text-[12.5px] text-[#7e7e96]">
            <span className="text-[#45465f]">{m.presenter}</span>
            {m.partnerName ? ` · ${m.partnerName}` : ""}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {upcoming ? (
          m.isScheduled ? (
            <button
              type="button"
              onClick={() => onSchedule(m)}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 text-[13.5px] font-medium text-[#16a34a] transition hover:bg-[#e6fbec]"
            >
              <Check className="size-4" />
              Added to calendar
            </button>
          ) : m.calendarOutdated ? (
            <button
              type="button"
              onClick={() => onSchedule(m)}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 text-[13.5px] font-medium text-[#92400e] transition hover:bg-[#fef3c7]"
            >
              Time changed · Update
            </button>
          ) : (
            <Button size="md" showIcon={false} onClick={() => onSchedule(m)}>
              Add to calendar
            </Button>
          )
        ) : null}
        <Link href={`/module/${m.slug}`} className="link-cta text-[12.5px] font-medium text-[#7c2ae8]">
          Open session
        </Link>
      </div>
    </article>
  );
}

function EventRow({ e, onSchedule }: { e: CohortEvent; onSchedule: (e: CohortEvent) => void }) {
  const when = sessionWhen(e.date, e.endDate);
  const now = useNow();
  // a confirmed time that's still ahead can go into the learner's own calendar
  const canAdd = !e.timeTba && now > 0 && new Date(e.date).getTime() > now;
  return (
    <article className="space-y-3 rounded-2xl border border-[#ececf2] bg-white p-4 sm:p-5">
      <div>
        <p className="text-[11.5px] font-medium text-[#0a66c2]">{e.kind === "linkedin-live" ? "LinkedIn Live" : "Event"}</p>
        <h3 className="mt-0.5 text-[15px] font-medium text-[#151534]">{e.title}</h3>
        <p className="mt-1 text-[12.5px] text-[#5f5f7a]">
          {e.timeTba ? (
            "Time to be announced"
          ) : (
            <>
              <time dateTime={e.date}>{when.time}</time>
              {!when.sameAsEt && <span className="text-[#9a9cbd]"> · {when.et}</span>}
            </>
          )}
        </p>
        {(e.subtitle || e.partnerName) && (
          <p className="mt-0.5 text-[12.5px] text-[#7e7e96]">
            {e.subtitle && <span className="text-[#45465f]">{e.subtitle}</span>}
            {e.subtitle && e.partnerName ? " · " : ""}
            {e.partnerName}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {canAdd && (
          <Button size="md" showIcon={false} onClick={() => onSchedule(e)}>
            Add to calendar
          </Button>
        )}
        {e.ctaActive === false ? (
          <ButtonLink href={e.link} size="md" variant={canAdd ? "white" : "primary"} disabled showIcon={false} title="Registration opens soon">
            {e.ctaText || "Save the Date"}
          </ButtonLink>
        ) : (
          <ButtonLink href={e.link} external size="md" variant={canAdd ? "white" : "primary"}>
            {e.ctaText || (e.kind === "linkedin-live" ? "Join on LinkedIn" : "Open event")}
          </ButtonLink>
        )}
      </div>
    </article>
  );
}
