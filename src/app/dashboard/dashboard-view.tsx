"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AppShell, Avatar } from "@/components/app/AppShell";
import { ScheduleModal } from "@/components/dashboard/ScheduleModal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Arrow } from "@/components/ui/Arrow";
import { Check } from "@/components/ui/Check";
import { useProfile } from "@/components/profile-provider";
import { useWallet } from "@/components/wallet-provider";
import { assetPath } from "@/lib/constants";
import {
  badgeApi,
  certificateApi,
  eventsApi,
  isAuthenticated,
  modulesApi,
  onboardApi,
  partnerApi,
  PARTNERS_COPY_DEFAULTS,
  type PartnersCopy,
  type BadgesResponse,
  type CertificateData,
  type ModuleItem,
  type OnboardStatusResponse,
  type PartnerItem,
} from "@/lib/api";
import type { CohortEvent } from "@/lib/types";
import { firstName, sessionWhen, shortAddress, tagCase, titleCase } from "@/lib/format";

const TOTAL_BADGES = 12;
const SESSIONS_STEP = 3;
const sectionTitle = "text-[17px] font-medium tracking-[-0.01em] text-[#45465f]";

const CalendarIcon = ({
  className = "size-3.5 text-[#7954ad]",
  strokeWidth = "1.7",
  rx = "2",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx={rx} />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

function BadgeSlots({
  modules,
  badges,
}: {
  modules: ModuleItem[];
  badges: BadgesResponse | null;
}) {
  const earned = new Set((badges?.badges ?? []).map((b) => {
    const found = modules.find((m) => m.badge?.name === b.name || m.slug === b.sourceModuleId);
    return found ? found.week : 0;
  }).filter(Boolean));

  const total = Math.max(TOTAL_BADGES, modules.length);
  const weeks = Array.from({ length: total }, (_, i) => i + 1);
  const next = weeks.find((w) => !earned.has(w));

  return (
    <ol className="mt-4 flex gap-1" aria-label={`${earned.size} of ${total} badges earned`}>
      {weeks.map((week) => {
        const m = modules.find((x) => x.week === week);
        const got = earned.has(week);
        return (
          <li
            key={week}
            title={`${m?.title ?? "Upcoming module"} · ${
              got ? "Earned" : week === next ? "Next to earn" : "Not earned yet"
            }`}
            className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
              got
                ? "bg-gradient-to-r from-[#9b4dff] to-[#7c2ae8]"
                : week === next
                ? "bg-[#e4d4ff]"
                : "bg-[#f0f0f6]"
            }`}
          />
        );
      })}
    </ol>
  );
}

function ProfileCard({ profile }: { profile: any }) {
  const link = profile.socialLink?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const meta = [profile.role, profile.organization].filter(Boolean).join(" · ");

  return (
    <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#ececf2] bg-white p-6 shadow-[0_2px_12px_rgba(23,23,48,0.03)]">
      <div className="relative">
        <div className="flex items-center gap-4">
          <span className="shrink-0 rounded-full bg-gradient-to-br from-[#9b4dff] via-[#c77dff] to-[#f0abfc] p-[2px]">
            <Avatar src={profile.photoUrl} name={profile.name} className="size-14 border-2 border-white" />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-[17px] font-medium leading-tight text-[#151534]">
              {profile.name || "Learner"}
            </h2>
            {meta && <p className="mt-1 break-words text-[13px] leading-snug text-[#7e7e96]">{meta}</p>}
          </div>
        </div>
        {profile.bio ? (
          <p className="mt-4 whitespace-pre-line break-words text-[12.5px] leading-5 text-[#5f5f7a]">{profile.bio}</p>
        ) : (
          <Link
            href="/settings#profile"
            className="mt-4 block text-[12.5px] leading-5 text-[#9a9cbd] hover:text-[#7c2ae8]"
          >
            Add a short bio. Members can see it on your profile.
          </Link>
        )}
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-[#f0f0f6] pt-4 text-[12.5px]">
        {link ? (
          <a
            href={profile.socialLink}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-2 text-[#7e7e96] transition-colors hover:text-[#151534]"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="size-4 shrink-0 text-[#9b4dff]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M6.5 9.5l3-3M7 4.5l1-1a2.83 2.83 0 0 1 4 4l-1 1M9 11.5l-1 1a2.83 2.83 0 0 1-4-4l1-1" />
            </svg>
            <span className="truncate">{link}</span>
          </a>
        ) : (
          <span className="text-[#9a9cbd]">No social link yet</span>
        )}
        <Link href="/settings#profile" className="link-cta shrink-0 font-medium text-[#7c2ae8]">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H2v-3l8.5-8.5z" />
          </svg>
          Edit profile
        </Link>
      </div>
    </section>
  );
}

const PART2_TITLE = "Close out your cohort";
const PART2_LOCKED = "Opens once you’ve finished every session and its quiz.";

function StartHere({ status }: { status: OnboardStatusResponse }) {
  const defaultCard = {
    title: "Welcome to Si Her DeFi",
    description: "Watch the welcome video, follow SI<3>, and share where you're starting from.",
    doneMessage: "You've completed Onboard Part 1.",
    stepLabel: "GET STARTED · SI HER DEFI",
    imageUrl: null,
    questionCount: 4,
    questionsMinutes: 5,
  };
  const card = status.part1Card || defaultCard;
  if (status.part1Done) {
    const lock = (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="9" width="10" height="8" rx="1.5" />
        <path d="M7 9V6a3 3 0 0 1 6 0v3" />
      </svg>
    );
    const done = status.part2Done ? 2 : 1;
    return (
      <div className="rounded-2xl border border-[#ececf2] bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <div className="flex items-center gap-1" aria-hidden="true">
            <span className="h-1.5 w-8 rounded-full bg-[#16a34a]" />
            <span
              className={`h-1.5 w-8 rounded-full ${status.part2Done ? "bg-[#16a34a]" : "bg-[#ecebf3]"}`}
            />
          </div>
          <span className="text-[12px] tabular-nums text-[#8e8ea6]">{done} of 2 complete</span>
        </div>
        <ol className="divide-y divide-[#f0f0f5]">
          <li className="flex items-center gap-4 p-4 sm:px-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
              <Check className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-[#16a34a]">Part 1 · Done</p>
              <h3 className="mt-0.5 text-[15px] font-medium text-[#151534]">{card.title}</h3>
              <p className="mt-0.5 text-[12.5px] leading-5 text-[#5f5f7a]">{card.doneMessage}</p>
            </div>
            <Link href="/onboard" className="link-cta shrink-0 text-[12.5px] font-medium text-[#7c2ae8]">
              Review
            </Link>
          </li>
          {status.part2Done ? (
            <li className="flex items-center gap-4 p-4 sm:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
                <Check className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-[#16a34a]">Part 2 · Done</p>
                <h3 className="mt-0.5 text-[15px] font-medium text-[#151534]">{PART2_TITLE}</h3>
                <p className="mt-0.5 text-[12.5px] leading-5 text-[#5f5f7a]">Thank you for closing out the cohort.</p>
              </div>
              <Link href="/onboard/part-2" className="link-cta shrink-0 text-[12.5px] font-medium text-[#7c2ae8]">
                Review
              </Link>
            </li>
          ) : status.part2Unlocked ? (
            <li className="flex flex-col gap-4 bg-[#fbf9ff] p-4 sm:flex-row sm:items-center sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f4effe] text-[13px] font-medium text-[#7c2ae8]">
                  2
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] text-[#7c2ae8]">Part 2 · Open now</p>
                  <h3 className="mt-0.5 text-[15px] font-medium text-[#151534]">{PART2_TITLE}</h3>
                  <p className="mt-0.5 text-[12.5px] leading-5 text-[#5f5f7a]">
                    You’ve finished every session. Close out the cohort in about 5 minutes.
                  </p>
                </div>
              </div>
              <ButtonLink href="/onboard/part-2" size="md" className="shrink-0 max-sm:w-full">
                Start Part 2
              </ButtonLink>
            </li>
          ) : (
            <li className="flex items-center gap-4 p-4 sm:px-5" aria-disabled="true">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#ece8f4] bg-[#fbfaff] text-[#a894c8]">
                {lock}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-[#a894c8]">Part 2</p>
                <h3 className="mt-0.5 text-[15px] font-medium text-[#8e8ea6]">{PART2_TITLE}</h3>
                <p className="mt-0.5 text-[12.5px] leading-5 text-[#8e8ea6]">{PART2_LOCKED}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f1ecf8] px-2.5 py-1 text-[11.5px] font-medium text-[#8a6fb8]">
                {lock}Locked
              </span>
            </li>
          )}
        </ol>
      </div>
    );
  }

  return (
    <div className="relative min-h-[190px] overflow-hidden rounded-2xl bg-[#0f0c1b] p-6 sm:p-7 text-white shadow-md">
      <Image
        alt=""
        fill
        sizes="(min-width: 1024px) 960px, 100vw"
        className="scale-[1.22] object-cover object-center"
        src={card.imageUrl ? assetPath(card.imageUrl) : assetPath("/SiHer_Onboard_Part 1.png")}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/20 pointer-events-none" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-white">
            ● {tagCase(card.stepLabel).split(" · ")[0]}
          </span>
          <h3 className="mt-2 text-[20px] sm:text-[22px] font-medium tracking-tight text-white">
            {card.title}
          </h3>
          <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/80">
            {card.description}
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-2">
          <div className="flex items-center gap-3">
            <ButtonLink href="/onboard" variant="white" size="md">
              {status.part1Status === "draft" ? "Continue" : "Start here"}
            </ButtonLink>
            <span className="text-[11.5px] text-white/80">
              {card.questionCount} questions · about {card.questionsMinutes} minutes
            </span>
          </div>
          <p className="ml-auto text-right text-[11px] italic leading-4 text-white/70">
            Required before Si Her DeFi modules unlock*
          </p>
        </div>
      </div>
    </div>
  );
}

function speakerParts(m: ModuleItem): { name: string; company?: string }[] {
  const list = (m.speakers ?? []).filter((x) => x?.name).map((x) => ({ name: x.name, company: x.companyName }));
  return list.length ? list : [{ name: m.presenter, company: m.partnerName || undefined }];
}

function Speakers({ m, tone = "light" }: { m: ModuleItem; tone?: "light" | "dark" }) {
  const parts = speakerParts(m);
  const nameCls = tone === "dark" ? "text-white/90" : "text-[#45465f]";
  if (parts.length === 1) return <>{<span className={nameCls}>{parts[0].name}</span>}{parts[0].company ? ` · ${parts[0].company}` : ""}</>;
  const shown = parts.slice(0, 2);
  return (
    <>
      {shown.map((x, i) => (
        <span key={x.name}>
          {i > 0 && (i === shown.length - 1 && parts.length <= 2 ? " & " : ", ")}
          <span className={nameCls}>{x.name}</span>
          {x.company ? ` (${x.company})` : ""}
        </span>
      ))}
      {parts.length > 2 && ` +${parts.length - 2} more`}
    </>
  );
}

const LinkedInMark = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);

function EventCard({ e }: { e: CohortEvent }) {
  const when = sessionWhen(e.date, e.endDate);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#ececf2] bg-white p-4 transition hover:border-[#dcd0f2] sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div
          className="w-[60px] shrink-0 overflow-hidden rounded-xl border border-[#e6e0f2] bg-white text-center leading-none"
          aria-hidden="true"
        >
          <div className="bg-gradient-to-b from-[#8b3df0] to-[#7c2ae8] py-1 text-[10.5px] font-medium text-white">
            {when.month}
          </div>
          <div className="py-2.5 text-[22px] font-medium tabular-nums tracking-[-0.02em] text-[#151534]">
            {when.day}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-medium text-[#151534]">{e.title}</h3>
            {e.kind === "linkedin-live" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1fb] px-2 py-0.5 text-[11px] font-medium text-[#0a66c2]">
                <LinkedInMark className="size-3" />
                LinkedIn Live
              </span>
            )}
          </div>
          <p className="mt-1 text-[12.5px] text-[#5f5f7a]">
            <time dateTime={e.date}>
              {when.weekday}, {when.month} {when.day}
              {e.timeTba ? " · Time to be announced" : ` · ${when.time}`}
            </time>
          </p>
          {(e.subtitle || e.partnerName) && (
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-[#7e7e96]">
              {e.subtitle && <span className="text-[#45465f]">{e.subtitle}</span>}
              {e.subtitle && e.partnerName ? " · " : ""}
              {e.partnerName}
            </p>
          )}
        </div>
      </div>
      {/* the CMS decides whether the button is live yet and what it says;
          until registration opens it's a grayed-out "Save the Date" */}
      {e.ctaActive === false ? (
        <ButtonLink
          href={e.link}
          size="md"
          disabled
          showIcon={false}
          title="Registration opens soon"
          className="shrink-0 max-sm:w-full"
        >
          {e.ctaText || "Save the Date"}
        </ButtonLink>
      ) : (
        <ButtonLink href={e.link} external size="md" className="shrink-0 max-sm:w-full">
          {e.ctaText || (e.kind === "linkedin-live" ? "Join on LinkedIn" : "Open event")}
        </ButtonLink>
      )}
    </div>
  );
}

function FeaturedModule({
  m,
  part1Done,
  onSchedule,
}: {
  m: ModuleItem;
  part1Done: boolean;
  onSchedule: (m: ModuleItem) => void;
}) {
  const upcoming = m.sessionState === "upcoming";
  // the week's own dashboard banner from the CMS; the shared cover when it has none.
  // (Not the video thumbnail: it has the session title printed on it, which clashes with the card's text.)
  const cover = m.bannerUrl;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#17142b] via-[#331c4b] to-[#121124] p-6 text-white shadow-md">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="absolute inset-0 size-full object-cover object-right" src={cover} />
      ) : (
        <Image
          alt=""
          fill
          sizes="(min-width: 1024px) 960px, 100vw"
          className="object-cover object-right"
          src={assetPath("/v2/module-cover.webp")}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#131124]/85 via-[#1a142e]/50 to-[#1a142e]/5 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#131124]/60 to-transparent pointer-events-none sm:hidden" />
      <div className="relative z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-white">
          {m.videoUrl ? "Session recording" : "Recording after the live session"}
        </span>
        <h3 className="mt-2 text-[20px] font-medium tracking-tight text-white">{m.title}</h3>
        <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-white/80 line-clamp-2">
          {m.description}
        </p>
        <div className="mt-3">
          <span className="text-[11px] text-white/75">
            Presented by <Speakers m={m} tone="dark" />
          </span>
        </div>
      </div>
      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          {part1Done ? (
            <>
              <ButtonLink href={`/module/${m.slug}`} size="md">
                Start session
              </ButtonLink>
              {upcoming && (
                <button
                  type="button"
                  onClick={() => onSchedule(m)}
                  className="rounded-full border border-white/30 bg-white/15 backdrop-blur-sm px-4 py-2 text-[12px] font-medium text-white hover:bg-white/25 active:scale-[0.99] transition cursor-pointer flex items-center gap-1.5"
                >
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className="size-3.5 text-current"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="12" height="11" rx="2" />
                    <path d="M2 7h12M5 1.5v3M11 1.5v3" />
                  </svg>
                  <span>
                    {m.isScheduled ? (
                      <span className="inline-flex items-center gap-1">
                        Added to calendar <Check className="size-3.5" />
                      </span>
                    ) : m.calendarOutdated ? (
                      "Time changed · Update calendar"
                    ) : (
                      "Add to calendar"
                    )}
                  </span>
                </button>
              )}
            </>
          ) : (
            <ButtonLink
              href={`/module/${m.slug}`}
              size="md"
              disabled
              title="Opens once Si Her Onboard – Part 1 is done"
            >
              Start session
            </ButtonLink>
          )}
          <span className="text-[11px] text-white/75">
            {!part1Done ? "Finish Part 1 to unlock · " : ""}
            {!upcoming && m.videoUrl ? "1 video · " : ""}
            {m.quiz?.questionCount ?? 3} questions · 1 badge
          </span>
        </div>
        {part1Done && (
          <div className="flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 backdrop-blur-md">
            {upcoming ? (
              <>
                <span className="inline-block size-2 rounded-full bg-white/50" />
                <span className="text-[11px] text-white/75">Recording coming soon</span>
              </>
            ) : m.sessionState === "live" ? (
              <>
                <span className="inline-block size-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[11px] text-white/75">Live now</span>
              </>
            ) : (
              <>
                <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-white/75">Quiz open</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  m,
  onSchedule,
}: {
  m: ModuleItem;
  onSchedule: (m: ModuleItem) => void;
}) {
  const when = m.scheduledDate ? sessionWhen(m.scheduledDate, m.endDate || undefined) : null;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#ececf2] bg-white p-4 transition hover:border-[#dcd0f2] sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {when && (
          <div
            className="w-[60px] shrink-0 overflow-hidden rounded-xl border border-[#e6e0f2] bg-white text-center leading-none"
            aria-hidden="true"
          >
            <div className="bg-gradient-to-b from-[#8b3df0] to-[#7c2ae8] py-1 text-[10.5px] font-medium text-white">
              {when.month}
            </div>
            <div className="py-2.5 text-[22px] font-medium tabular-nums tracking-[-0.02em] text-[#151534]">
              {when.day}
            </div>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-[#151534]">{m.title}</h3>
          {when && (
            <p className="mt-1 text-[12.5px] text-[#5f5f7a]">
              <time dateTime={m.scheduledDate ?? undefined}>
                {when.weekday}, {when.month} {when.day} · {when.time}
              </time>
            </p>
          )}
          <p
            className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-[#7e7e96]"
            title={speakerParts(m)
              .map((x) => (x.company ? `${x.name} (${x.company})` : x.name))
              .join(", ")}
          >
            <Speakers m={m} />
          </p>
        </div>
      </div>
      {m.sessionState === "upcoming" ? (
        m.isScheduled ? (
          <button
            type="button"
            onClick={() => onSchedule(m)}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 text-[14px] font-medium text-[#16a34a] transition hover:bg-[#e6fbec]"
          >
            <Check className="size-4" />
            <span>Added to calendar</span>
          </button>
        ) : m.calendarOutdated ? (
          // added before the session moved: the learner's calendar has the old time
          <button
            type="button"
            onClick={() => onSchedule(m)}
            title="This session has moved since you added it"
            className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 text-[14px] font-medium text-[#92400e] transition hover:bg-[#fef3c7] max-sm:w-full"
          >
            <CalendarIcon className="size-4 text-[#b45309]" />
            <span>Time changed · Update</span>
          </button>
        ) : (
          <Button size="md" showIcon={false} onClick={() => onSchedule(m)} className="shrink-0 max-sm:w-full">
            <span className="inline-flex items-center gap-2">
              <CalendarIcon className="size-4" />
              <span>Add to calendar</span>
            </span>
          </Button>
        )
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          {m.quiz?.isPassed ? (
            <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1 text-[12px] text-[#16a34a]">
              Badge earned
            </span>
          ) : m.quiz?.isSkipped ? (
            <span className="rounded-full border border-[#e4e4ed] bg-[#f6f6fa] px-3 py-1 text-[12px] text-[#7e7e96]">
              Skipped · no badge
            </span>
          ) : (
            <span className="rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-3 py-1 text-[12px] text-[#6d25d6]">
              Quiz open
            </span>
          )}
          <ButtonLink href={`/module/${m.slug}`} size="md">
            Open
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function CertificateRow({
  unlocked,
  passed,
  total,
}: {
  unlocked: boolean;
  passed: number;
  total: number;
}) {
  const lockIcon = (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="9" width="10" height="8" rx="1.5" />
      <path d="M7 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:p-5 ${
        unlocked ? "border-[#ececf2] bg-white" : "border-[#ececf2] bg-[#fbfaff]"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div
          className={`grid size-[60px] shrink-0 place-items-center rounded-xl border ${
            unlocked
              ? "border-[#e6e0f2] bg-[#f8f5fe] text-[#7c2ae8]"
              : "border-[#ece8f4] bg-white text-[#a894c8]"
          }`}
        >
          {unlocked ? (
            <svg
              className="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="9" r="5" />
              <path d="M9.2 13.5 8 21l4-2.2 4 2.2-1.2-7.5" />
            </svg>
          ) : (
            <span className="[&>svg]:size-6">{lockIcon}</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[15px] font-medium text-[#151534]">
            Your certificate
            {!unlocked && (
              <span className="rounded-full bg-[#f1ecf8] px-2 py-0.5 text-[11px] font-medium text-[#8a6fb8]">
                Locked
              </span>
            )}
          </h3>
          <p className="mt-1 text-[12.5px] leading-5 text-[#5f5f7a]">
            {unlocked
              ? "Minted on Base, with every badge you earned."
              : "Finish every session and its quiz to unlock it. Then mint it on Base with the badges you earned."}
          </p>
          {!unlocked && (
            <p className="mt-1 text-[12px] tabular-nums text-[#8e8ea6]">
              {passed} of {total} quizzes done
            </p>
          )}
        </div>
      </div>
      {unlocked ? (
        <ButtonLink href="/certificate" size="md" className="shrink-0 max-sm:w-full">
          View certificate
        </ButtonLink>
      ) : (
        <ButtonLink href="/certificate" size="md" disabled showIcon={false} className="shrink-0 max-sm:w-full">
          <span className="inline-flex items-center gap-2">
            {lockIcon}
            <span>View certificate</span>
          </span>
        </ButtonLink>
      )}
    </div>
  );
}

function ReadyToMint({ modules, badges }: { modules: number; badges: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-7 sm:p-8 text-white shadow-xl border border-purple-500/20 min-h-[260px] flex items-center">
      <Image
        alt="Your certificate is ready"
        fill
        sizes="(min-width: 1024px) 960px, 100vw"
        className="object-cover object-right"
        src={assetPath("/Your certificate is ready.png")}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent pointer-events-none" />
      <div className="relative z-10 max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 text-[11px] font-medium text-purple-200 backdrop-blur-sm">
          ● Ready to mint
        </span>
        <h2 className="text-[24px] sm:text-[28px] font-medium tracking-tight text-white leading-tight">
          Your certificate is ready
        </h2>
        <p className="text-[12.5px] leading-relaxed text-white/80">
          {modules} {modules === 1 ? "module" : "modules"}, {badges} {badges === 1 ? "badge" : "badges"}, one verifiable record on Base. Minting writes it to your wallet — it’s yours, not ours.
        </p>
        <div className="pt-2 flex flex-wrap items-center gap-4">
          <ButtonLink href="/certificate" variant="white" size="md">
            Mint on Base
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

const PARTNER_MARK: Record<string, React.ReactNode> = {
  "partner-defi-for-good-foundation": (
    <span className="text-[15px] font-medium tracking-[-0.02em]">
      <span className="text-[#1d6fe0]">DeFi</span> <span className="text-[12px] text-[#22a06b]">for Good</span>
    </span>
  ),
  "partner-tangem": (
    <span className="flex items-center gap-1.5 text-[15px] font-medium tracking-[-0.02em] text-[#111]">
      <span className="grid h-3.5 w-3.5 grid-rows-[1fr_2fr] gap-[2px]" aria-hidden="true">
        <span className="bg-[#111]" />
        <span className="mx-auto w-1.5 bg-[#111]" />
      </span>
      tangem
    </span>
  ),
  "partner-kast": (
    <span className="rounded bg-[#111] px-2 py-0.5 text-[13px] font-medium tracking-[0.02em] text-white">
      KAST
    </span>
  ),
};

const domain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function PartnerCard({ p }: { p: PartnerItem }) {
  const referral = /referral/i.test(p.footerText);
  return (
    <article className="group flex flex-col rounded-2xl border border-[#ececf2] bg-white p-5 transition hover:border-[#dcd0f2]">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 min-w-11 place-items-center rounded-xl border border-[#ececf2] bg-white px-3">
          {p.imageUrl ? (
            // the partner's logo from the CMS
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={p.title} className="max-h-7 max-w-[112px] object-contain" src={p.imageUrl} />
          ) : (
            PARTNER_MARK[p.id] ?? <span className="text-[14px] font-medium text-[#151534]">{p.title.charAt(0)}</span>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-[#f4effe] px-2.5 py-1 text-[11.5px] font-medium text-[#7c2ae8]">
          {titleCase(p.tag)}
        </span>
      </div>
      <h3 className="mt-4 text-[15px] font-medium text-[#151534]">{p.title}</h3>
      <p className="mt-1 flex-1 text-[12.5px] leading-5 text-[#5f5f7a]">{p.description}</p>
      <ButtonLink href={p.actionUrl ?? "#"} external className="mt-5">
        {p.actionText.replace(/\s*↗\s*$/, "")}
      </ButtonLink>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11.5px] text-[#9a9cbd]">
        {p.actionUrl ? (
          // the partner's site, same place as the button, in a new tab
          <a
            href={p.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate underline-offset-2 transition-colors hover:text-[#7c2ae8] hover:underline"
          >
            {domain(p.actionUrl)}
          </a>
        ) : (
          <span className="truncate">{domain("")}</span>
        )}
        {referral ? (
          <span className="shrink-0" title={p.footerText}>
            Referral link
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 text-[#16a34a]">
            <Check className="size-3.5" />Verified
          </span>
        )}
      </div>
    </article>
  );
}

export default function DashboardView() {
  return (
    <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { profile } = useProfile();
  const { wallet } = useWallet();

  const [status, setStatus] = useState<OnboardStatusResponse | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [badges, setBadges] = useState<BadgesResponse | null>(null);
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [scheduling, setScheduling] = useState<ModuleItem | null>(null);
  const [shown, setShown] = useState(SESSIONS_STEP);
  const [events, setEvents] = useState<CohortEvent[]>([]);
  const [partnersCopy, setPartnersCopy] = useState<PartnersCopy>(PARTNERS_COPY_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    try {
      const [s, m, b, c, p] = await Promise.allSettled([
        onboardApi.getStatus(),
        modulesApi.getAll(),
        badgeApi.getBadges(),
        certificateApi.getCertificate(),
        partnerApi.getPartners(),
      ]);

      if (s.status === "fulfilled") setStatus(s.value);
      if (m.status === "fulfilled" && Array.isArray(m.value)) {
        setModules([...m.value].sort((a, z) => a.week - z.week));
      }
      if (b.status === "fulfilled") setBadges(b.value);
      if (c.status === "fulfilled") setCert(c.value);
      if (p.status === "fulfilled" && Array.isArray(p.value)) setPartners(p.value);
      eventsApi.getAll().then(setEvents).catch(() => {});
      partnerApi.getCopy().then(setPartnersCopy).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !status) {
    return (
      <AppShell>
        <div className="grid min-h-[60vh] place-items-center text-[#7c2ae8]">
          <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  // a skipped quiz counts as done, like a passed one (just without the badge)
  const isDone = (m: ModuleItem) => !!m.quiz?.isPassed || !!m.quiz?.isSkipped;
  const featured = modules.find((m) => !isDone(m)) ?? null;
  const rest = modules.filter((m) => m !== featured);
  const unlocked = !!cert && cert.status !== "locked";
  // finished sessions sit in their own list under the featured card; the
  // upcoming list keeps only what's still ahead (until everything is done,
  // when one "Your sessions" list shows them all)
  const completed = unlocked ? [] : rest.filter(isDone);
  // sessions + LinkedIn Lives in one list, by date
  type Item = { kind: "module"; at: number; m: ModuleItem } | { kind: "event"; at: number; e: CohortEvent };
  const items: Item[] = [
    ...rest
      .filter((m) => unlocked || !isDone(m))
      .map((m) => ({ kind: "module" as const, at: new Date(m.scheduledDate || 0).getTime(), m })),
    ...events.map((e) => ({ kind: "event" as const, at: new Date(e.date).getTime(), e })),
  ].sort((a, z) => a.at - z.at);
  const earned = badges?.earnedCount ?? 0;
  const earnedBadgeNames = new Set((badges?.badges ?? []).map((b) => b.name));
  const nextBadge = [...modules].sort((x, y) => x.week - y.week).find((m) => !earnedBadgeNames.has(m.badge?.name));
  const subtitle = !status.part1Done
    ? "Introduce yourself to unlock the weekly sessions."
    : unlocked
    ? "You did it. Every session and quiz is done, and your certificate is ready to mint on Base."
    : earned === 0
    ? `You're in. Watch ${featured ? `“${featured.title}”` : "the first session"} and pass its quiz to earn your first badge.`
    : `You've earned ${earned} of ${TOTAL_BADGES} badges. Each session and quiz brings you closer to your certificate.`;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-[26px] font-medium leading-[1.15] tracking-[-0.02em] text-[#151534] sm:text-[30px]">
              Welcome, {firstName(profile.name)} <span aria-hidden="true">👋</span>
            </h1>
            <p className="max-w-[560px] text-[15px] leading-6 text-[#4c4d77]">{subtitle}</p>
          </div>
          {wallet?.address ? (
            <a
              href={`https://basescan.org/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Wallet ${shortAddress(wallet.address)} on Base — view on BaseScan`}
              className="mt-1 hidden shrink-0 items-center gap-2 rounded-full md:inline-flex border border-[#e7e7f1] bg-white py-1.5 pl-3 pr-3.5 text-[12.5px] shadow-[0_1px_2px_rgba(23,23,48,0.04)] transition hover:border-[#d6d6e4] hover:shadow-[0_2px_8px_rgba(23,23,48,0.06)]"
            >
              <span className="size-2 rounded-full bg-[#0052ff]" />
              <span className="font-medium text-[#151534]">Base</span>
              <span className="h-3 w-px bg-[#e7e7f1]" />
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#16a34a] opacity-40 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-[#16a34a]" />
              </span>
              <span className="font-medium text-[#15803d]">Active</span>
            </a>
          ) : (
            <Link
              href="/wallet"
              className="mt-1 hidden shrink-0 items-center gap-2 rounded-full md:inline-flex border border-[#e7e7f1] bg-white py-1.5 pl-3 pr-3.5 text-[12.5px] transition hover:border-[#d6d6e4]"
            >
              <span className="size-2 rounded-full bg-[#c4c4d4]" />
              <span className="font-medium text-[#151534]">Base</span>
              <span className="h-3 w-px bg-[#e7e7f1]" />
              <span className="font-medium text-[#7c2ae8]">Connect wallet</span>
            </Link>
          )}
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ProfileCard profile={profile} />
          <section className="flex flex-col justify-between rounded-2xl border border-[#ececf2] bg-white p-6 shadow-[0_2px_12px_rgba(23,23,48,0.03)]">
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-[15px] font-medium text-[#151534]">Badges earned</h3>
                <span className="text-[13px] font-medium text-[#151534] tabular-nums">
                  {earned}
                  <span className="font-medium text-[#9a9cbd]"> / {TOTAL_BADGES}</span>
                </span>
              </div>
              <BadgeSlots modules={modules} badges={badges} />
              {earned > 0 ? (
                <ul className="mt-4 grid grid-cols-12 gap-1.5" aria-label="Your badges">
                  {badges?.badges?.map((b) => (
                    <li key={b.badgeId} title={b.name} className="max-w-10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={assetPath(b.image)}
                        alt={b.name}
                        className="aspect-[8/9] w-full object-contain drop-shadow-[0_2px_4px_rgba(94,50,149,0.25)]"
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[12.5px] leading-5 text-[#7e7e96]">
                  Pass each week’s quiz to earn that module’s badge for your certificate.
                </p>
              )}
            </div>
            {earned >= TOTAL_BADGES ? (
              <p className="mt-4 flex items-center gap-2 border-t border-[#f0f0f6] pt-4 text-[12.5px] text-[#7e7e96]">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]">
                  <Check className="size-3.5" />
                </span>
                <span className="min-w-0 truncate">
                  <span className="font-medium text-[#151534]">All {TOTAL_BADGES} badges earned.</span> They’re all on your certificate.
                </span>
              </p>
            ) : nextBadge ? (
              <p className="mt-4 flex items-center gap-2 border-t border-[#f0f0f6] pt-4 text-[12.5px] text-[#7e7e96]">
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="size-4 shrink-0 text-[#9b4dff]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 1.5l5.6 3.25v6.5L8 14.5l-5.6-3.25v-6.5z" />
                </svg>
                <span className="min-w-0 truncate">
                  Next badge: <span className="font-medium text-[#151534]">{nextBadge.title}</span>
                </span>
              </p>
            ) : null}
          </section>
        </div>

        {!status.part1Done && (
          <section className="space-y-3">
            <h2 className={sectionTitle}>Begin your journey</h2>
            <StartHere status={status} />
          </section>
        )}

        <section className="space-y-5">
          <div className="flex items-center justify-between">
            {unlocked ? (
              <>
                <h2 className={sectionTitle}>Your learning path</h2>
                <span className="text-[12.5px] font-medium text-[#16a34a]">● Certificate unlocked</span>
              </>
            ) : (
              <>
                <h2 className={sectionTitle}>Your learning path</h2>
                <span className="text-[12.5px] text-[#8e8ea6]">
                  {status.part1Done ? "Finish every session to unlock your certificate" : "Opens once Part 1 is done"}
                </span>
              </>
            )}
          </div>
          <div className="space-y-4">
            {featured && (
              <FeaturedModule m={featured} part1Done={status.part1Done} onSchedule={setScheduling} />
            )}
            {completed.length > 0 && (
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11.5px] font-medium text-[#9a9cbd]">Completed ({completed.length})</h2>
                  <span className="text-[11.5px] text-[#9a9cbd]">Rewatch any time</span>
                </div>
                <div className="space-y-3">
                  {completed.map((m) => (
                    <SessionCard key={m.slug} m={m} onSchedule={setScheduling} />
                  ))}
                </div>
              </div>
            )}
            <div className={`space-y-3 pt-3 ${items.length === 0 ? "hidden" : ""}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-[11.5px] font-medium text-[#9a9cbd]">
                  {unlocked ? `Your sessions (${items.length})` : `Upcoming sessions (${items.length})`}
                </h2>
                <span className="text-[11.5px] text-[#9a9cbd]">
                  {unlocked ? "All done. Rewatch any time." : "Add them to your calendar now"}
                </span>
              </div>
              <div className="relative space-y-3">
                {items.slice(0, shown).map((it) =>
                  it.kind === "module" ? (
                    <SessionCard key={it.m.slug} m={it.m} onSchedule={setScheduling} />
                  ) : (
                    <EventCard key={it.e.id} e={it.e} />
                  )
                )}
                {shown < items.length && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-[#f8f8fc]/0 via-[#f8f8fc]/80 to-[#f8f8fc] sm:h-24"
                  />
                )}
              </div>
              {items.length > SESSIONS_STEP && (
                <div className={`relative flex justify-center ${shown < items.length ? "-mt-8" : "pt-1"}`}>
                  {shown < items.length ? (
                    <button
                      type="button"
                      onClick={() => setShown((n) => n + SESSIONS_STEP)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#e2e2ec] bg-white px-4 py-2 text-[12.5px] font-medium text-[#45465f] transition hover:border-[#d4c2f5] hover:text-[#7c2ae8]"
                    >
                      Show more sessions <span className="text-[#9a9cbd]">({items.length - shown})</span>
                      <svg
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                        className="size-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShown(SESSIONS_STEP)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium text-[#7e7e96] transition hover:text-[#151534]"
                    >
                      Show fewer
                      <svg
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                        className="size-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 10l4-4 4 4" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            {status.part1Done && (
              <div className="space-y-3 pt-3">
                <h2 className="text-[11.5px] font-medium text-[#9a9cbd]">Your onboarding</h2>
                <StartHere status={status} />
              </div>
            )}
            <CertificateRow
              unlocked={unlocked}
              passed={modules.filter(isDone).length}
              total={modules.length}
            />
            {unlocked && cert?.status !== "minted" && <ReadyToMint modules={modules.length} badges={earned} />}
          </div>
        </section>

        {partners.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className={sectionTitle}>{partnersCopy.heading}</h2>
              {partnersCopy.subheading && (
                <span className="text-[12.5px] text-[#8e8ea6]">{partnersCopy.subheading}</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((p) => (
                <PartnerCard key={p.id} p={p} />
              ))}
            </div>
            {partners.some((p) => /referral/i.test(p.footerText)) && (
              <p className="text-[11.5px] text-[#9a9cbd]">{partnersCopy.referralNote}</p>
            )}
          </section>
        )}

        <footer className="py-6 text-center text-[11px] text-[#9ca3af]">© 2026 · Si Her DeFi</footer>

        {scheduling && (
          <ScheduleModal
            module={scheduling}
            onClose={() => setScheduling(null)}
            onScheduled={() => {
              loadData();
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
