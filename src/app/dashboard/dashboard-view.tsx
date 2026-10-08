"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import DashboardSidebar from "@/components/dashboard-sidebar";
import ScheduleSessionModal, { SessionData } from "@/components/schedule-session-modal";
import { truncateAddress, useWallet } from "@/components/wallet-provider";
import { useProfile } from "@/components/profile-provider";
import {
  CALENDAR_PROVIDER_LABELS,
  CalendarProvider,
  calendarTypeFor,
  certificateMintedStore,
  moduleCompletedStore,
  scheduledSessionsStore,
  useCertificateMinted,
  useModuleCompleted,
  useScheduledSessions,
} from "@/lib/cohort-progress";
import { assetPath } from "@/lib/constants";
import { formatSessionTime, modulePath, pickCurrentModule } from "@/lib/modules";
import {
  profileApi,
  walletApi,
  modulesApi,
  certificateApi,
  badgeApi,
  partnerApi,
  onboardApi,
  isAuthenticated,
  ModuleItem,
  BadgesResponse,
  PartnerItem,
  MoreWaysContent,
  OnboardStatusResponse,
} from "@/lib/api";


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DashboardState = "initial" | "week1" | "certificate" | "post_cohort";

const BADGE_DOTS = Array.from({ length: 10 });

/** Fallback until /badges answers: one badge per weekly module. */
const COHORT_BADGE_TOTAL = 12;

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function DashboardView() {
  return (
    <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Content (needs Suspense boundary for useSearchParams)
// ---------------------------------------------------------------------------

function DashboardContent() {
  const router = useRouter();

  const { saveProfile } = useProfile();
  const { wallet, isOnBase, openModal, saveWallet } = useWallet();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [eventToast, setEventToast] = useState<string | null>(null);
  const [cmsModules, setCmsModules] = useState<ModuleItem[]>([]);
  const [badgesData, setBadgesData] = useState<BadgesResponse | null>(null);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [moreWays, setMoreWays] = useState<MoreWaysContent | null>(null);
  const [onboardStatus, setOnboardStatus] = useState<OnboardStatusResponse | null>(null);
  const [onboardLoadFailed, setOnboardLoadFailed] = useState(false);

  const retryOnboardStatus = () => {
    setOnboardLoadFailed(false);
    onboardApi
      .getStatus()
      .then(setOnboardStatus)
      .catch(() => setOnboardLoadFailed(true));
  };

  // Protect route & sync user profile, wallet, module progress, badges, and partners from MongoDB
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    let isMounted = true;

    async function syncBackendState() {
      try {
        const [
          profileRes,
          walletRes,
          modulesRes,
          certRes,
          badgesRes,
          partnersRes,
          onboardRes,
          moreWaysRes,
        ] = await Promise.allSettled([
          profileApi.getProfile(),
          walletApi.getStatus(),
          modulesApi.getAll(),
          certificateApi.getCertificate(),
          badgeApi.getBadges(),
          partnerApi.getPartners(),
          onboardApi.getStatus(),
          partnerApi.getMoreWays(),
        ]);

        if (!isMounted) return;

        // 1. Sync Profile
        if (profileRes.status === "fulfilled" && profileRes.value) {
          const p = profileRes.value;
          saveProfile({
            name: p.name || "",
            role: p.role || "",
            organization: p.organization || "",
            socialLink: p.socialLink || "",
            bio: p.bio || "",
            photoUrl: p.photoUrl !== undefined ? p.photoUrl : null,
          });
        }

        // 2. Sync Wallet
        if (
          walletRes.status === "fulfilled" &&
          walletRes.value?.connected &&
          walletRes.value?.address
        ) {
          const addr = walletRes.value.address;
          if (addr) {
            saveWallet({
              address: addr,
              chainId: walletRes.value.chainId || "0x2105",
            });
          }
        }

        // 3. Sync Modules & Prerequisite completion from MongoDB
        if (modulesRes.status === "fulfilled" && Array.isArray(modulesRes.value)) {
          const mods = modulesRes.value;
          setCmsModules(mods);
          // The certificate unlocks when the module marked "Unlocks Certificate"
          // in the CMS is completed — i.e. its quiz was passed on the server.
          moduleCompletedStore.set(
            mods.some((m) => m.isPrerequisiteForCertificate && m.isCompleted),
          );

          const newSchedules: Record<string, CalendarProvider> = {};
          mods.forEach((m) => {
            if (m.isScheduled && m.scheduledProvider) {
              const provider: CalendarProvider =
                m.scheduledProvider === "other" ? "custom" : m.scheduledProvider;
              newSchedules[m.slug] = provider;
              newSchedules[m.id] = provider;
            }
          });
          if (Object.keys(newSchedules).length > 0) {
            scheduledSessionsStore.set({
              ...scheduledSessionsStore.get(),
              ...newSchedules,
            });
          }
        }

        // 4. Sync Badges from MongoDB
        if (badgesRes.status === "fulfilled" && badgesRes.value) {
          setBadgesData(badgesRes.value);
        }

        // 5. Sync Partners from MongoDB
        if (moreWaysRes.status === "fulfilled") {
          setMoreWays(moreWaysRes.value);
        }
        if (partnersRes.status === "fulfilled" && Array.isArray(partnersRes.value)) {
          setPartners(partnersRes.value);
        }

        // 6. Sync Onboard Status from MongoDB (+ the "Start here" card from the CMS).
        // A failed request leaves the status unknown — modules stay locked and
        // the card offers a retry instead of guessing.
        if (onboardRes.status === "fulfilled" && onboardRes.value) {
          setOnboardStatus(onboardRes.value);
        } else {
          setOnboardLoadFailed(true);
        }

        // 7. Sync Certificate status
        if (certRes.status === "fulfilled" && certRes.value) {
          // The server is the source of truth for both flags
          const cert = certRes.value;
          certificateMintedStore.set(cert.status === "minted");
          moduleCompletedStore.set(cert.status !== "locked");
        }
      } catch (err) {
        console.warn("Could not sync dashboard state from backend:", err);
      }
    }

    syncBackendState();

    return () => {
      isMounted = false;
    };
  }, [router, saveProfile, saveWallet]);

  // Progress is read from the shared stores during render, so there is no
  // flash of the "not started" dashboard before the real state arrives.
  const storedTask = useModuleCompleted();
  const storedMinted = useCertificateMinted();

  // Both come from the backend (module quiz passed / certificate minted) —
  // never from URL parameters.
  const taskCompleted = storedTask;
  const isMinted = storedMinted;

  const showToast = (msg: string) => {
    setEventToast(msg);
    setTimeout(() => setEventToast(null), 3500);
  };
  const toastMessage = eventToast;

  const [activeModalSession, setActiveModalSession] = useState<SessionData | null>(null);
  const scheduledSessions = useScheduledSessions();

  const handleOpenScheduleModal = (session: SessionData) => {
    setActiveModalSession(session);
  };

  const handleSessionScheduled = async (session: SessionData, provider: CalendarProvider) => {
    try {
      await modulesApi.schedule(session.id, calendarTypeFor(provider));
    } catch (err) {
      console.warn("Could not persist session schedule to backend:", err);
    }
    showToast(
      provider === "proton"
        ? `"${session.title}" downloaded — import it in Proton Calendar to finish.`
        : `Added "${session.title}" to ${CALENDAR_PROVIDER_LABELS[provider]}!`,
    );
  };

  // Onboarding progress comes only from the backend — never from the URL or
  // local storage — so modules can't be opened by skipping Part 1.
  const isPart1Done = onboardStatus?.part1Done ?? false;

  const isWeek1Done = taskCompleted;

  const isWeekDone = (weekNum: number) => {
    const mod = cmsModules.find((m) => m.week === weekNum);
    if (!mod) return false;
    const fromApi = mod.isCompleted;
    const fromBadges = badgesData?.badges.some(
      (b) => b.badgeId === `badge_${mod.slug}` || (mod.id && b.sourceModuleId === mod.id)
    );
    return fromApi || !!fromBadges;
  };

  // One badge per weekly module; onboarding awards none.
  const totalBadges = badgesData?.totalCohortBadges ?? COHORT_BADGE_TOTAL;
  const totalBadgesEarned = Array.from({ length: totalBadges }, (_, i) => i + 1).filter(
    isWeekDone,
  ).length;

  const dashboardState: DashboardState = isMinted
    ? "post_cohort"
    : isWeek1Done
      ? "certificate"
      : isPart1Done
        ? "week1"
        : "initial";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8f8fc] font-sans antialiased text-[#171730]">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-60 rounded-xl bg-[#171730] px-4 py-2.5 text-[12.5px] font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-3">
          {toastMessage}
        </div>
      )}

      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-14 sm:py-8 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* ── Header row ── */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <WelcomeGreeting
              dashboardState={dashboardState}
              earnedTotal={totalBadgesEarned}
              totalBadges={totalBadges}
            />

            <div className="flex items-center gap-3">
              {/* Connected wallet pill */}
              {wallet ? (
                <a
                  href={`https://basescan.org/address/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#e4e4ed] bg-white px-3 py-1.5 shadow-xs hover:shadow-md transition"
                  title={wallet.address}
                >
                  <span className={`size-2 rounded-full ${isOnBase ? "bg-[#0052ff]" : "bg-amber-400"}`} />
                  <span className="text-[11px] font-semibold text-[#171730]">Base</span>
                  <span className="font-mono text-[11px] text-[#8e8ea6]">
                    {truncateAddress(wallet.address)}
                  </span>
                  <span className="text-[10px] text-[#9ca3af]">↗</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={openModal}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e4ed] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#7c2ae8] shadow-xs hover:bg-[#faf7ff] transition cursor-pointer"
                >
                  <span className="size-2 rounded-full bg-[#dcdce8]" />
                  Connect wallet
                </button>
              )}
            </div>
          </div>

          {/* ── Post-cohort certificate showcase ── */}
          {dashboardState === "post_cohort" && <PostCohortCertificateCard />}

          {/* ── Profile + Badges ── */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ProfileCard />
            <BadgesCard
              cmsModules={cmsModules}
              totalBadges={totalBadges}
              earnedTotal={totalBadgesEarned}
              isWeekDone={isWeekDone}
            />
          </div>

          {/* ── Start Here ── */}
          <StartHereSection
            onboardStatus={onboardStatus}
            loadFailed={onboardLoadFailed}
            onRetry={retryOnboardStatus}
          />

          {/* ── This Week / Still Open / Upcoming Sessions ── */}
          <ThisWeekSection
            isPart1Done={isPart1Done}
            dashboardState={dashboardState}
            taskCompleted={taskCompleted}
            onOpenScheduleModal={handleOpenScheduleModal}
            scheduledSessions={scheduledSessions}
            cmsModules={cmsModules}
          />

          {/* ── From Our Partners ── */}
          <PartnersSection partners={partners} />

          {/* ── More Ways ── */}
          {moreWays && <BuildSection content={moreWays} />}

          {/* ── Footer ── */}
          <footer className="py-6 text-center text-[11px] text-[#9ca3af]">
            © 2026 · SI HER DEFI
          </footer>
        </div>
      </main>

      {/* Schedule Session Modal */}
      <ScheduleSessionModal
        isOpen={!!activeModalSession}
        onClose={() => setActiveModalSession(null)}
        session={activeModalSession}
        onScheduled={handleSessionScheduled}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WelcomeGreeting({
  dashboardState,
  earnedTotal,
  totalBadges = 13,
}: {
  dashboardState: DashboardState;
  earnedTotal: number;
  totalBadges?: number;
}) {
  const { profile } = useProfile();
  const firstName = profile.name ? profile.name.trim().split(" ")[0] : "Learner";

  let subtitle = "Let's get you set up for Si Her DeFi. Start with onboarding below.";
  if (dashboardState === "post_cohort" || earnedTotal >= totalBadges) {
    subtitle = "You've finished the Si Her DeFi cohort. Your verifiable certificate is ready.";
  } else if (earnedTotal > 0) {
    subtitle = `You've earned ${earnedTotal} of ${totalBadges} badges. Complete more weekly sessions to build your credential.`;
  } else if (dashboardState !== "initial") {
    subtitle = "You're all set. Complete the Week 1 module to earn your first badge.";
  }

  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-xl bg-[#f0e9fc] px-3.5 py-1.5 text-[14px] font-bold text-[#7c2ae8]">
        <span>
          {dashboardState === "post_cohort"
            ? `Welcome back, ${firstName}`
            : `Welcome, ${firstName}`}
        </span>
        <span className="text-base">👋</span>
      </div>
      <h1 className="mt-2 text-[15px] font-normal text-[#5f5f7a]">
        {subtitle}
      </h1>
    </div>
  );
}

function PostCohortCertificateCard() {
  const { profile } = useProfile();
  return (
    <section className="rounded-2xl border border-[#ececf2] bg-white p-6 shadow-[0_2px_12px_rgba(23,23,48,0.03)] flex flex-col md:flex-row items-start md:items-center gap-6">
      {/* Mini Certificate Preview */}
      <div className="relative w-[130px] shrink-0 overflow-hidden rounded-xl border border-[#e2e2ec] bg-white p-3 shadow-xs text-center space-y-1.5">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5b1ea6] via-[#7526dd] to-[#a855f7]" />
        <div className="mx-auto flex justify-center pt-1">
          <div className="relative size-4">
            <Image
              src={assetPath("/Badge_earned.png")}
              alt="Crest"
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        </div>
        <p className="text-[5px] font-bold tracking-wider text-[#8e8ea6] uppercase">
          CERTIFICATE OF COMPLETION
        </p>
        <p className="text-[8.5px] font-bold text-[#171730]">{profile.name}</p>
        <p className="text-[6px] font-extrabold tracking-wider text-[#171730] uppercase">
          SI HER DEFI
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1 pt-0.5">
          {BADGE_DOTS.map((_, i) => (
            <span key={i} className="size-1.5 rounded-full bg-[#7c2ae8]" />
          ))}
        </div>
      </div>

      {/* Details & Actions */}
      <div className="flex-1 space-y-3">
        <div>
          <span className="inline-block rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[#16a34a] uppercase">
            MINTED ON BASE
          </span>
          <h2 className="mt-1.5 text-[20px] font-bold text-[#171730]">
            Cohort 01 certificate
          </h2>
          <p className="mt-0.5 text-[10.5px] font-semibold tracking-wider text-[#8e8ea6] uppercase">
            TOKEN #0145 · BASE · MINTED 3 DEC 2026
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-[#5b1ea6] via-[#7526dd] to-[#8a33ea] px-4 py-2 text-[12px] font-semibold text-white shadow-xs hover:brightness-105 active:scale-[0.99] transition cursor-pointer"
          >
            Share on LinkedIn
          </button>
          <button
            type="button"
            className="rounded-xl bg-[#f4effe] px-4 py-2 text-[12px] font-semibold text-[#7c2ae8] hover:bg-[#ede5fc] active:scale-[0.99] transition cursor-pointer"
          >
            Add to LinkedIn profile
          </button>
          <Link
            href="/certificate"
            className="rounded-xl border border-[#e2e2ec] px-4 py-2 text-[12px] font-semibold text-[#171730] hover:bg-gray-50 active:scale-[0.99] transition cursor-pointer"
          >
            View on BaseScan
          </Link>
          <button
            type="button"
            className="rounded-xl border border-[#e2e2ec] px-4 py-2 text-[12px] font-semibold text-[#171730] hover:bg-gray-50 active:scale-[0.99] transition cursor-pointer"
          >
            Download image
          </button>
        </div>
      </div>
    </section>
  );
}

function ProfileCard() {
  const { profile } = useProfile();
  const avatarSrc = profile.photoUrl || assetPath("/ada-portrait.jpg");
  const bioText =
    profile.bio ||
    (profile.role && profile.organization
      ? `${profile.role} at ${profile.organization}. Building on Base.`
      : "Building payment rails for small merchants. Here to understand stablecoins properly before I ship anything on-chain.");

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-[#ececf2] bg-white p-6 shadow-[0_2px_12px_rgba(23,23,48,0.03)]">
      <div>
        <div className="flex items-start justify-between">
          <div className="relative size-14 overflow-hidden rounded-full border border-black/10 shadow-xs">
            <Image
              src={avatarSrc}
              alt={profile.name}
              fill
              unoptimized
              sizes="56px"
              className="object-cover"
            />
          </div>
          <Link
            href="/profile?from=dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e2ec] px-3 py-1 text-[11.5px] font-semibold text-[#5f5f7a] transition hover:bg-gray-50 hover:text-[#171730]"
          >
            <EditPencilIcon />
            <span>Edit profile</span>
          </Link>
        </div>

        <div className="mt-4">
          <h2 className="text-[15px] font-bold text-[#171730]">{profile.name}</h2>
          <p className="text-[11.5px] font-medium text-[#8e8ea6] mt-0.5">{profile.role}</p>
          <p className="mt-3 text-[12px] leading-relaxed text-[#5f5f7a]">
            {bioText}
          </p>
        </div>
      </div>
    </section>
  );
}

function BadgesCard({
  cmsModules,
  totalBadges,
  earnedTotal,
  isWeekDone,
}: {
  cmsModules: ModuleItem[];
  totalBadges: number;
  earnedTotal: number;
  isWeekDone: (weekNum: number) => boolean;
}) {
  return (
    <section className="flex flex-col justify-between rounded-2xl border border-[#ececf2] bg-white p-6 shadow-[0_2px_12px_rgba(23,23,48,0.03)]">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold tracking-wider text-[#8e8ea6] uppercase">
            Badges earned
          </h3>
          <span className="text-[11px] font-semibold text-[#7c2ae8] tabular-nums">
            {earnedTotal} of {totalBadges}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5 items-center">
          {/* One badge per weekly module */}
          {Array.from({ length: totalBadges }, (_, i) => {
            const weekNum = i + 1;
            const earned = isWeekDone(weekNum);
            const mod = cmsModules.find((m) => m.week === weekNum);
            const title = mod ? mod.title : `Week ${weekNum} Module`;

            return (
              <HexagonBadge
                key={weekNum}
                earned={earned}
                title={`Week ${weekNum}: ${title} ${
                  earned ? "(Earned ✓)" : "(Locked — Pass quiz to earn)"
                }`}
              />
            );
          })}
        </div>
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-[#9ca3af]">
        {earnedTotal >= totalBadges
          ? `All ${totalBadges} cohort badges earned! Verifiable on your on-chain certificate.`
          : earnedTotal > 0
          ? "Every badge is a passed quiz. Your certificate lists the ones you earn."
          : "Complete weekly module quizzes to earn partner badges for your certificate."}
      </p>
    </section>
  );
}

function StartHereSection({
  onboardStatus,
  loadFailed,
  onRetry,
}: {
  onboardStatus: OnboardStatusResponse | null;
  loadFailed: boolean;
  onRetry: () => void;
}) {
  const card = onboardStatus?.part1Card ?? null;

  if (!onboardStatus && loadFailed) {
    return (
      <section className="space-y-3">
        <h2 className="text-[11.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">
          START HERE
        </h2>
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ececf2] bg-white p-5 shadow-xs"
        >
          <p className="text-[13px] text-[#5f5f7a]">
            We couldn’t load your onboarding progress. Please try again.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-[#171730] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-black cursor-pointer"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  // Still loading — hold the space so the card doesn't flash the wrong state
  if (!onboardStatus) {
    return (
      <section className="space-y-3">
        <h2 className="text-[11.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">
          START HERE
        </h2>
        <div className="min-h-[190px] rounded-2xl bg-[#ececf2] animate-pulse" aria-busy="true" />
      </section>
    );
  }

  const meta = card
    ? [
        card.questionCount > 0
          ? `${card.questionCount} QUESTION${card.questionCount === 1 ? "" : "S"}`
          : null,
        card.questionsMinutes ? `ABOUT ${card.questionsMinutes} MINUTES` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section className="space-y-3">
      <h2 className="text-[11.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">
        START HERE
      </h2>

      {!onboardStatus.part1Done ? (
        /* Part 1 not finished — content from the CMS */
        <div className="relative min-h-[190px] overflow-hidden rounded-2xl bg-[#0f0c1b] p-6 sm:p-7 text-white shadow-md">
          {card?.imageUrl && (
            <Image
              src={assetPath(card.imageUrl)}
              alt=""
              fill
              priority
              unoptimized
              className="object-cover object-center opacity-85"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/75 pointer-events-none" />

          <div className="relative z-10 flex h-full flex-col justify-between gap-6">
            <div>
              {card?.stepLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider text-white uppercase">
                  ● {card.stepLabel}
                </span>
              )}
              <h3 className="mt-2 text-[20px] sm:text-[22px] font-bold tracking-tight text-white">
                {card?.title ?? "Si Her Onboard"}
              </h3>
              <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/80">
                {card
                  ? card.description
                  : "Onboarding opens shortly. Check back soon — the modules unlock once it's done."}
              </p>
            </div>

            {card && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <Link
                    href="/onboard"
                    className="rounded-full bg-white px-4 py-2 text-[12.5px] font-bold text-[#171730] shadow-sm transition hover:bg-gray-100 cursor-pointer"
                  >
                    {onboardStatus.part1Status === "draft" ? "Continue →" : "Start here →"}
                  </Link>
                  {meta && (
                    <span className="text-[10.5px] font-medium tracking-wider text-white/75 uppercase">
                      {meta}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/65 italic">
                  Required before Si Her DeFi modules unlock*
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Part 1 completed */
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#bbf7d0] bg-white p-4.5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]">
              <CheckMarkIcon />
            </span>
            <div>
              <h3 className="text-[13.5px] font-bold text-[#171730]">
                {card?.title ?? "Si Her Onboard"} — done
              </h3>
              {card?.doneMessage && (
                <p className="text-[11.5px] text-[#6b7280] mt-0.5">{card.doneMessage}</p>
              )}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 text-[11px] font-bold text-[#16a34a]">
            {onboardStatus.part2Done ? "2 of 2" : "1 of 2"}
          </span>
        </div>
      )}
    </section>
  );
}

interface UpcomingSessionItem extends SessionData {
  companyInitials: string;
  presenter: string;
  dateBadge: string;
  module: ModuleItem;
}


function ThisWeekSection({
  isPart1Done,
  dashboardState,
  taskCompleted,
  onOpenScheduleModal,
  scheduledSessions,
  cmsModules = [],
}: {
  isPart1Done: boolean;
  dashboardState: DashboardState;
  taskCompleted: boolean;
  onOpenScheduleModal: (session: SessionData) => void;
  scheduledSessions: Record<string, CalendarProvider>;
  cmsModules?: ModuleItem[];
}) {
  const heading =
    dashboardState === "post_cohort"
      ? "YOUR MODULES"
      : taskCompleted
        ? "MODULES & CREDENTIALS"
        : "THIS WEEK";

  const featured = pickCurrentModule(cmsModules);
  const featuredSession: SessionData | null = featured
    ? {
        id: featured.slug,
        slug: featured.slug,
        title: featured.title,
        weekLabel: featured.dateLabel,
        startDate: featured.scheduledDate ?? undefined,
        endDate: featured.endDate ?? undefined,
        location: featured.location || "Si Her DeFi Virtual Stage",
        description: featured.description,
        meetingUrl: featured.liveLink ?? undefined,
      }
    : null;

  // Captured once per mount — render itself must stay pure
  const [renderedAt] = useState(() => Date.now());

  // Every module other than the featured one, in week order, in one list
  // (as in the design). Rows for sessions still ahead offer "Add to calendar";
  // rows for sessions already held link straight to the module.
  const upcomingList: UpcomingSessionItem[] = [...cmsModules]
    .filter((m) => m.slug !== featured?.slug)
    .sort((a, b) => a.week - b.week)
    .map((m) => ({
      id: m.slug,
      slug: m.slug,
      title: m.title,
      weekLabel: m.dateLabel,
      companyInitials: (m.companyTag || "SI").slice(0, 3).toUpperCase(),
      presenter: [m.presenter, m.partnerName].filter(Boolean).join(" · "),
      dateBadge: m.scheduledDate
        ? `Opens ${new Date(m.scheduledDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
        : "Date TBA",
      startDate: m.scheduledDate ?? undefined,
      endDate: m.endDate ?? undefined,
      location: m.location || "Si Her DeFi Virtual Stage",
      description: m.description,
      module: m,
    }));

  const featuredMeta = featured
    ? [
        featured.videoUrl ? "1 VIDEO" : null,
        featured.quiz.available ? `${featured.quiz.questionCount} QUESTIONS` : null,
        "1 BADGE",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const featuredStatus = featured
    ? featured.quiz.isPassed || featured.isCompleted
      ? { label: "Badge earned", tone: "done" as const }
      : featured.sessionState === "live"
        ? { label: "Live now", tone: "live" as const }
        : featured.sessionState === "upcoming"
          ? {
              label: featured.scheduledDate ? `Live ${formatSessionTime(featured.scheduledDate)}` : "Date TBA",
              tone: "soon" as const,
            }
          : featured.quiz.available
            ? { label: "Quiz open", tone: "open" as const }
            : { label: "Quiz coming soon", tone: "soon" as const }
    : null;

  return (
    <section className="space-y-5">
      {/* ── This Week Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[11.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">
          {heading}
        </h2>
        {!taskCompleted && (
          <span className="text-[11px] text-[#9ca3af]">
            {dashboardState === "initial" ? "Opens once Part 1 is done" : "Pass the quiz to unlock your certificate"}
          </span>
        )}
        {taskCompleted && (
          <span className="text-[11px] font-semibold text-[#16a34a]">
            ● Certificate unlocked
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* ── Featured Module (from the CMS) ── */}
        {!featured || !featuredSession ? (
          <div className="rounded-2xl border border-dashed border-[#d8d8e2] bg-white/60 p-6 text-center text-[12.5px] text-[#8e8ea6]">
            The first module will appear here once it’s published.
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#17142b] via-[#331c4b] to-[#121124] p-6 text-white shadow-md">
            {featured.bannerUrl ? (
              <Image
                src={assetPath(featured.bannerUrl)}
                alt=""
                fill
                unoptimized
                className="object-cover object-right md:object-center opacity-85"
              />
            ) : featured.thumbnailUrl ? (
              <Image
                src={assetPath(featured.thumbnailUrl)}
                alt=""
                fill
                unoptimized
                className="object-cover object-center opacity-30 mix-blend-screen"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-[#131124]/95 via-[#1a142e]/70 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="text-[10.5px] font-bold tracking-widest text-white/60 uppercase mb-2">
                LIVE SESSION · {featured.companyTag || "SI HER DEFI"}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider text-white uppercase">
                ● {featured.dateLabel}
              </span>
              <h3 className="mt-2 text-[20px] font-bold tracking-tight text-white">{featured.title}</h3>
              {featured.description && (
                <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-white/80 line-clamp-2">
                  {featured.description}
                </p>
              )}
              {(featured.presenter || featured.partnerName) && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded bg-black/60 font-mono text-[11px] font-bold text-white/90">
                    {(featured.companyTag || "SI").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-[11px] text-white/75">
                    Presented by {featured.presenter}
                    {featured.partnerName && featured.partnerName !== featured.presenter
                      ? ` (${featured.partnerName})`
                      : ""}
                  </span>
                </div>
              )}
            </div>

            <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                {isPart1Done ? (
                  <Link
                    href={modulePath(featured)}
                    className="rounded-full bg-gradient-to-r from-[#501c9c] to-[#983cf4] px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-105 cursor-pointer"
                  >
                    {featured.quiz.isPassed ? "Open module →" : "Start session →"}
                  </Link>
                ) : (
                  <Link
                    href="/onboard"
                    title="Modules open once Si Her Onboard – Part 1 is done"
                    className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[12.5px] font-semibold text-white/80 transition hover:bg-white/20"
                  >
                    <span aria-hidden="true">🔒</span>
                    Finish Part 1 to unlock
                  </Link>
                )}
                {featured.sessionState === "upcoming" && featured.scheduledDate && (
                  <button
                    type="button"
                    onClick={() => onOpenScheduleModal(featuredSession)}
                    className="rounded-full border border-white/30 bg-white/15 backdrop-blur-sm px-4 py-2 text-[12px] font-semibold text-white hover:bg-white/25 active:scale-[0.99] transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CalendarSmallIcon />
                    <span>
                      {scheduledSessions[featured.slug] || featured.isScheduled ? "Scheduled ✓" : "Add to calendar"}
                    </span>
                  </button>
                )}
                {featuredMeta && (
                  <span className="text-[10px] font-medium tracking-wider text-white/75 uppercase">
                    {featuredMeta}
                  </span>
                )}
              </div>
              {featuredStatus && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block size-2 rounded-full ${
                      featuredStatus.tone === "done"
                        ? "bg-emerald-400"
                        : featuredStatus.tone === "live"
                          ? "bg-red-500 animate-pulse"
                          : featuredStatus.tone === "open"
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-white/50"
                    }`}
                  />
                  <span className="text-[11px] text-white/75">{featuredStatus.label}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── UPCOMING SESSIONS Section (Dynamic from CMS) ── */}
        {upcomingList.length > 0 && (
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11.5px] font-semibold tracking-wider text-[#9a9cbd] uppercase">
              UPCOMING SESSIONS ({upcomingList.length})
            </h2>
            <span className="text-[11.5px] text-[#9a9cbd]">
              Add them to your calendar now
            </span>
          </div>

          <div className="space-y-3">
            {upcomingList.map((session) => {
              // Added on this browser, or saved on the account from another device
              const isScheduled = !!scheduledSessions[session.id] || session.module.isScheduled;
              const m = session.module;
              // Still ahead of its live date → calendar; already held → open the module
              const isAhead =
                m.sessionState === "upcoming" ||
                (!!m.scheduledDate && new Date(m.scheduledDate).getTime() > renderedAt);
              const done = m.quiz.isPassed || m.isCompleted;
              return (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-dashed border-[#d8d8e2] bg-white/60 px-5 sm:px-6 py-4.5 sm:py-5 shadow-xs transition hover:border-[#b8b8ca] hover:bg-white"
                >
                  <div className="flex items-center gap-4">
                    {/* Calendar outline icon */}
                    <span className="shrink-0 text-[#9a9cbd]">
                      <svg
                        className="size-5 text-[#8688AE]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2.5" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>

                    <div>
                      <span className="text-[10.5px] font-normal tracking-wider text-[#8688AE] uppercase">
                        {session.weekLabel}
                      </span>
                      <h3 className="text-[13.5px] font-medium text-[#4C4D77] font-geist mt-0.5">
                        {session.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="grid size-4 place-items-center rounded bg-[#eef0f6] text-[8.5px] font-bold text-[#8e90a8]">
                          {session.companyInitials}
                        </span>
                        <span className="text-[11.5px] text-[#8688AE]">
                          {session.presenter}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {!isAhead ? (
                      <>
                        <span
                          className={`rounded-full border px-3.5 py-1 text-[12px] whitespace-nowrap ${
                            done
                              ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]"
                              : m.sessionState === "live"
                                ? "border-[#fecaca] bg-[#fef2f2] text-[#dc2626]"
                                : "border-[#E7E7F1] bg-[#F5F5FC] text-[#8688AE]"
                          }`}
                        >
                          {done
                            ? "Badge earned ✓"
                            : m.sessionState === "live"
                              ? "Live now"
                              : m.quiz.available
                                ? "Quiz open"
                                : "Recording available"}
                        </span>
                        {isPart1Done ? (
                          <Link
                            href={modulePath(m)}
                            className="inline-flex items-center gap-2 rounded-full border border-[#baa8d8] px-4 py-1.5 text-[12px] font-medium text-[#7954ad] hover:bg-[#f6f2fc] hover:border-[#967ec4] transition shrink-0"
                          >
                            {done ? "Open →" : "Start →"}
                          </Link>
                        ) : (
                          <span className="rounded-full border border-[#E7E7F1] px-4 py-1.5 text-[12px] text-[#9ca3af] shrink-0">
                            🔒 After Part 1
                          </span>
                        )}
                      </>
                    ) : (
                    <>
                    <span className="rounded-full border border-[#E7E7F1] bg-[#F5F5FC] px-3.5 py-1 text-[12px] text-[#8688AE] whitespace-nowrap">
                      {session.dateBadge}
                    </span>

                    {isScheduled ? (
                      <button
                        type="button"
                        onClick={() => onOpenScheduleModal(session)}
                        title="Added — click to add it to another calendar"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-1.5 text-[11.5px] font-semibold text-[#16a34a] shrink-0 hover:bg-[#dcfce7] transition cursor-pointer"
                      >
                        <span>✓</span>
                        <span>Added</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenScheduleModal(session)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#baa8d8] bg-transparent px-4 py-1.5 text-[12px] font-medium text-[#7954ad] hover:bg-[#f6f2fc] hover:border-[#967ec4] transition cursor-pointer shrink-0"
                      >
                        <svg
                          className="size-3.5 text-[#7954ad]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>Add to calendar</span>
                      </button>
                    )}
                    </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* ── Your Certificate Teaser Card (matching Figma design) ── */}
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-dashed border-[#eaddf8] bg-transparent px-5 sm:px-6 py-4.5 sm:py-5 shadow-none transition-all ${
            taskCompleted ? "ring-1 ring-[#7c2ae8]/20 bg-[#fbf9ff]" : ""
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Hexagonal certificate badge icon matching Figma */}
            <div className="relative size-7 shrink-0 flex items-center justify-center">
              <svg
                className="size-7 text-[#e0d0fa]"
                viewBox="0 0 28 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <path
                  d="M14 2 L25 8.2 L25 23.8 L14 30 L3 23.8 L3 8.2 Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="size-3.5 text-[#9a70d8]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="9" r="4.5" />
                  <path d="M9.5 13.5L8.5 20.5l3.5-2 3.5 2-1-7" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-[13.5px] font-semibold text-[#1e1e38]">Your certificate</h3>
              <p className="text-[11.5px] text-[#8e90a8] mt-0.5">
                Minted on Base at the end of the cohort, showing the badges you earned.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex justify-end">
            {taskCompleted ? (
              <Link
                href="/certificate"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#501c9c] via-[#6d25d6] to-[#983cf4] px-4 py-2 text-[12px] font-semibold text-white shadow-xs hover:brightness-105 transition cursor-pointer shrink-0"
              >
                <span>View Certificate</span>
                <span>→</span>
              </Link>
            ) : (
              <span className="rounded-full border border-[#e2e4ef] bg-transparent px-4 py-1.5 text-[11.5px] text-[#9698b4] shrink-0">
                Unlocks after Week 1 quiz
              </span>
            )}
          </div>
        </div>

        {/* Certificate ready hero banner when task is completed */}
        {taskCompleted && (
          <div className="relative overflow-hidden rounded-3xl p-7 sm:p-8 text-white shadow-xl border border-purple-500/20 min-h-[260px] flex items-center">
            <Image
              src={assetPath("/Your certificate is ready.png")}
              alt="Your certificate is ready"
              fill
              priority
              className="object-cover object-right"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent pointer-events-none" />

            <div className="relative z-10 max-w-md space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 text-[10px] font-bold tracking-wider text-purple-200 uppercase backdrop-blur-sm">
                ● READY TO MINT
              </span>
              <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-white leading-tight">
                Your certificate is ready
              </h2>
              <p className="text-[12.5px] leading-relaxed text-white/80">
                Twelve modules, thirteen badges, one verifiable record on Base. Minting
                writes it to your wallet — it’s yours, not ours.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/certificate"
                  className="rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[#171730] shadow-lg transition hover:bg-gray-100 cursor-pointer"
                >
                  Mint on Base →
                </Link>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    <span className="size-5 rounded-full bg-purple-400 border border-white" />
                    <span className="size-5 rounded-full bg-blue-400 border border-white" />
                    <span className="size-5 rounded-full bg-emerald-400 border border-white" />
                  </div>
                  <span className="text-[11.5px] text-white/75">
                    96 learners have minted theirs
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}



function PartnersSection({ partners = [] }: { partners?: PartnerItem[] }) {
  // Nothing published (or the request failed) → no section, rather than stale copy
  if (partners.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">
          FROM OUR PARTNERS ({partners.length})
        </h2>
        <span className="text-[11px] text-[#9ca3af]">
          Verified ecosystem partners · opens in new tab
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {partners.map((p) => (
          <PartnerCard key={p.id} partner={p} />
        ))}
      </div>
    </section>
  );
}

function BuildSection({ content }: { content: MoreWaysContent }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2a074c] via-[#6e1352] to-[#b83d2a] p-6 sm:p-8 text-white shadow-lg">
      <div className="absolute top-2 right-1/4 size-44 rounded-full bg-gradient-to-b from-[#ffb077] via-[#ff6b6b]/40 to-transparent blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <h2 className="text-[20px] font-bold tracking-tight text-white sm:text-[22px]">{content.heading}</h2>
        {content.subheading && <p className="mt-1 text-[12.5px] text-white/80">{content.subheading}</p>}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {content.cards.map((card) => (
            <div key={card.id} className="rounded-2xl bg-white/10 p-4.5 backdrop-blur-md border border-white/15">
              <h3 className="text-[13.5px] font-bold text-white">{card.title}</h3>
              {card.description && (
                <p className="mt-1 text-[11.5px] leading-relaxed text-white/70">{card.description}</p>
              )}
              {card.linkUrl && (
                <a
                  href={card.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-[11.5px] font-semibold text-white underline underline-offset-2 hover:text-white/90"
                >
                  {card.linkText}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Reusable card components
// ---------------------------------------------------------------------------

function HexagonBadge({ earned = false, title }: { earned?: boolean; title?: string }) {
  return (
    <div
      className="relative size-[34px] shrink-0 flex items-center justify-center transition-transform hover:scale-105"
      title={title || (earned ? "Badge earned" : "Locked badge")}
    >
      <svg viewBox="0 0 36 40" className="size-full">
        <polygon
          points="18,1 35,10 35,30 18,39 1,30 1,10"
          className={
            earned
              ? "fill-[#7c2ae8] stroke-[#6a1fc9] stroke-1 shadow-sm"
              : "fill-[#f8f8fc] stroke-[#dcdce8] stroke-[1.5] stroke-dasharray-[2_2]"
          }
        />
        {earned && (
          <g transform="translate(10.5, 12)">
            <circle cx="7.5" cy="8" r="6" className="fill-[#10b981]" />
            <path
              d="M4.5 8l2 2 4-4"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

function PartnerCard({ partner }: { partner: PartnerItem }) {
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#ececf2] bg-white shadow-xs transition hover:shadow-md">
      <div className="relative h-28 bg-[#1e1538] flex items-center justify-center overflow-hidden">
        {partner.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetPath(partner.imageUrl)}
            alt={partner.title}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="grid size-11 place-items-center rounded-full bg-[#2a1f4d] text-white/90 border border-white/10 font-bold text-sm">
            {partner.title.charAt(0)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11.5px] font-bold text-[#171730]">{partner.title}</span>
            {partner.tag && (
              <span className="shrink-0 rounded-full bg-[#f4f4fa] px-2 py-0.5 text-[8.5px] font-bold tracking-wider text-[#7e7e96] uppercase">
                {partner.tag}
              </span>
            )}
          </div>
          {partner.description && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-[#5f5f7a] line-clamp-2">{partner.description}</p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[#f0f0f5]">
          {partner.actionUrl && (
            <a
              href={partner.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center w-full rounded-xl border border-[#e2e2ec] py-2 text-[12px] font-semibold text-[#171730] transition hover:bg-gray-50 cursor-pointer"
            >
              {partner.actionText}
            </a>
          )}
          {partner.footerText && (
            <p className="mt-2 text-center text-[10px] text-[#9ca3af]">{partner.footerText}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icon components
// ---------------------------------------------------------------------------

function EditPencilIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-3 text-[#7c2ae8]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H2v-3l8.5-8.5z" />
    </svg>
  );
}

function CheckMarkIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2.5 6 5 8.5 9.5 3.5" />
    </svg>
  );
}

function CertificateNavIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="3" width="12" height="14" rx="2" />
      <path d="M7 7h6M7 10h6M7 13h3" />
    </svg>
  );
}

function CalendarSmallIcon() {
  return (
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
  );
}

function SessionBoxIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4 text-[#7c2ae8]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3.5" width="14" height="13" rx="2" />
      <path d="M3 7.5h14M7 2v3M13 2v3" />
      <circle cx="10" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

