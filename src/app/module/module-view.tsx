"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import DashboardSidebar from "@/components/dashboard-sidebar";
import ScheduleSessionModal, { SessionData } from "@/components/schedule-session-modal";
import SessionVideo, { timestampToSeconds, type SessionVideoHandle } from "@/components/session-video";
import { calendarTypeFor, moduleCompletedStore, useScheduledSessions } from "@/lib/cohort-progress";
import { assetPath } from "@/lib/constants";
import {
  ApiErrorResponse,
  isAuthenticated,
  modulesApi,
  onboardApi,
  quizApi,
  type ModuleItem,
  type QuizAnswerFeedback,
  type QuizAttemptResult,
  type QuizData,
  type QuizHint,
  type SpeakerItem,
} from "@/lib/api";
import { formatSessionTime, modulePath, timeUntil } from "@/lib/modules";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCompanyList(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function sessionData(m: ModuleItem): SessionData {
  return {
    id: m.slug,
    slug: m.slug,
    title: m.title,
    weekLabel: m.dateLabel,
    startDate: m.scheduledDate ?? undefined,
    endDate: m.endDate ?? undefined,
    location: m.location || "Si Her DeFi Virtual Stage",
    description: m.description,
    meetingUrl: m.liveLink ?? undefined,
    presenter: m.presenter,
  };
}

function linkedInShareUrl(text: string) {
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

// ---------------------------------------------------------------------------
// Session media — recording, or artwork with the live schedule
// ---------------------------------------------------------------------------

function SessionMedia({
  module,
  videoRef,
}: {
  module: ModuleItem;
  videoRef: React.RefObject<SessionVideoHandle | null>;
}) {
  const artwork = module.thumbnailUrl ? assetPath(module.thumbnailUrl) : null;
  const tag = module.companyTag || "SI HER DEFI";

  if (module.sessionState === "recorded" && module.videoUrl) {
    return (
      <SessionVideo
        ref={videoRef}
        url={module.videoUrl}
        posterUrl={artwork ?? undefined}
        caption={`${tag} · SESSION RECORDING`}
      />
    );
  }

  const when = formatSessionTime(module.scheduledDate);
  const countdown = timeUntil(module.scheduledDate);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#17142b] via-[#331c4b] to-[#121124] shadow-sm">
      {artwork && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artwork} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45" />

      <div className="absolute top-4 left-4 z-10">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-white/90 uppercase backdrop-blur-sm">
          <span>{tag}</span>
          <span className="text-white/40">·</span>
          <span>
            {module.sessionState === "live"
              ? "LIVE NOW"
              : module.sessionState === "processing"
                ? "RECORDING SOON"
                : "UPCOMING SESSION"}
          </span>
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-3 p-5">
        <div className="space-y-1">
          {module.sessionState === "live" ? (
            <p className="flex items-center gap-2 text-[14px] font-bold text-white">
              <span className="size-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              Live now
            </p>
          ) : module.sessionState === "processing" ? (
            <p className="text-[14px] font-bold text-white">The recording will be posted here soon</p>
          ) : (
            <p className="text-[14px] font-bold text-white">
              {when ? `Live ${when}` : "Date to be announced"}
            </p>
          )}
          {module.sessionState === "upcoming" && countdown && (
            <p className="text-[12px] text-white/75">Starts {countdown}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {module.sessionState === "live" && module.liveLink && (
            <a
              href={module.liveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-4 py-2 text-[12.5px] font-bold text-[#171730] shadow-sm transition hover:bg-gray-100"
            >
              Join live session ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz card
// ---------------------------------------------------------------------------

function QuizCard({
  module,
  quiz,
  onStart,
}: {
  module: ModuleItem;
  quiz: QuizData | null;
  onStart: () => void;
}) {
  const heading = `Earn your week ${module.week} badge`;
  const shell = (children: ReactNode, label = "READY WHEN YOU ARE") => (
    <div className="rounded-2xl border border-[#ececf2] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
      <span className="text-[10.5px] font-bold tracking-wider text-[#7c2ae8] uppercase">{label}</span>
      {children}
    </div>
  );

  if (!quiz) {
    return shell(
      <div>
        <h4 className="text-[16.5px] font-bold text-[#171730]">{heading}</h4>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#5f5f7a]">
          This module’s quiz isn’t published yet. Check back after the session.
        </p>
      </div>,
      "QUIZ COMING SOON",
    );
  }

  if (quiz.isPassed) {
    return shell(
      <>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetPath(quiz.badge.image)} alt="" className="size-12 object-contain" />
          <div>
            <h4 className="text-[15px] font-bold text-[#171730]">Badge earned ✓</h4>
            <p className="text-[12px] text-[#5f5f7a]">{quiz.badge.name}</p>
          </div>
        </div>
        {module.isPrerequisiteForCertificate && (
          <Link
            href="/certificate"
            className="block w-full rounded-xl bg-gradient-to-r from-[#5b1ea6] via-[#7526dd] to-[#8a33ea] py-3 text-center text-[13px] font-semibold text-white shadow-md shadow-purple-950/20 transition hover:brightness-105"
          >
            View your certificate →
          </Link>
        )}
      </>,
      "COMPLETED",
    );
  }

  if (!quiz.isOpen) {
    const when = formatSessionTime(module.scheduledDate);
    return shell(
      <div>
        <h4 className="text-[16.5px] font-bold text-[#171730]">{heading}</h4>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#5f5f7a]">
          The quiz opens after the live session{when ? ` on ${when}` : ""}.
        </p>
      </div>,
      "OPENS AFTER THE SESSION",
    );
  }

  const outOfAttempts = quiz.attemptsRemaining === 0 && !quiz.currentAttempt;
  if (outOfAttempts) {
    const retryWhen = formatSessionTime(quiz.retryAvailableAt);
    const retryIn = timeUntil(quiz.retryAvailableAt);
    return shell(
      <div className="space-y-3">
        <div>
          <h4 className="text-[16.5px] font-bold text-[#171730]">{heading}</h4>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#5f5f7a]">
            You’ve used all {quiz.maxAttempts} attempts
            {quiz.lastResult ? ` (last: ${quiz.lastResult.score} of ${quiz.lastResult.totalQuestions})` : ""}.{" "}
            {retryWhen
              ? "Take some time to rewatch the session — a fresh set of attempts opens soon."
              : "Please reach out to the Si Her team."}
          </p>
        </div>
        {retryWhen && (
          <div className="rounded-xl border border-[#ddd6fe] bg-[#f5f3ff] p-3 text-[12px] text-[#5b21b6]">
            <p className="font-semibold">You can try again {retryIn ?? "shortly"}</p>
            <p className="mt-0.5 text-[11px] text-[#7c3aed]">{retryWhen}</p>
          </div>
        )}
      </div>,
      retryWhen ? "TRY AGAIN SOON" : "NO ATTEMPTS LEFT",
    );
  }

  const allCorrect = quiz.passingScore >= quiz.totalQuestions;
  const attemptNumber = quiz.currentAttempt?.attemptNumber ?? quiz.attemptsUsed + 1;

  return shell(
    <>
      <div>
        <h4 className="text-[16.5px] font-bold text-[#171730]">{heading}</h4>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#5f5f7a]">
          {allCorrect
            ? `Answer all ${quiz.totalQuestions} correctly to earn the badge.`
            : `Get at least ${quiz.passingScore} of ${quiz.totalQuestions} right to earn the badge.`}{" "}
          {quiz.maxAttempts} attempts — if you don’t pass, rewatch and retry.
        </p>
      </div>

      <ul className="space-y-2.5 text-[12px] text-[#5f5f7a]">
        <li className="flex items-center gap-2.5">
          <span className="grid size-4 place-items-center rounded border border-[#b8b8cc] text-[10px]">✓</span>
          <span>
            {quiz.totalQuestions} questions · {allCorrect ? `all ${quiz.totalQuestions} correct` : `${quiz.passingScore} to pass`}
          </span>
        </li>
        <li className="flex items-center gap-2.5">
          <span className="grid size-4 place-items-center text-[12px] text-[#8e8ea6]">★</span>
          <span>
            Attempt {attemptNumber} of {quiz.maxAttempts}
          </span>
        </li>
      </ul>

      {quiz.lastResult && !quiz.currentAttempt && (
        <p className="rounded-xl bg-[#fffbeb] p-3 text-[11.5px] text-[#92400e]">
          Last attempt: {quiz.lastResult.score} of {quiz.lastResult.totalQuestions}. Review the hints below the video,
          then try again.
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-xl bg-gradient-to-r from-[#5b1ea6] via-[#7526dd] to-[#8a33ea] py-3 text-[13.5px] font-semibold text-white shadow-md shadow-purple-950/20 transition hover:brightness-105 active:scale-[0.99] cursor-pointer"
      >
        {quiz.currentAttempt ? "Resume quiz →" : quiz.attemptsUsed > 0 ? "Try again →" : "Start quiz →"}
      </button>
    </>,
  );
}

// ---------------------------------------------------------------------------
// Speakers
// ---------------------------------------------------------------------------

function SpeakerCard({ speaker }: { speaker: SpeakerItem }) {
  const telegram = speaker.telegramHandle?.replace(/^@/, "");
  return (
    <div className="rounded-2xl border border-[#ececf2] bg-white p-4 sm:p-5 shadow-2xs space-y-3.5 transition-all hover:border-[#dcdce8]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded bg-[#f0f0f5] px-2 py-0.5 text-[10px] font-bold text-[#5f5f7a]">
            {speaker.companyTag || "SPEAKER"}
          </span>
          <span className="text-[12px] font-bold text-[#171730]">{speaker.companyName}</span>
        </div>
        {speaker.companyLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={speaker.companyLogoUrl}
            alt={speaker.companyName}
            className="h-5 max-w-[70px] object-contain opacity-80"
          />
        )}
      </div>

      <div className="flex items-start gap-3">
        {speaker.headshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={speaker.headshotUrl}
            alt={speaker.name}
            className="size-12 rounded-full object-cover border border-[#ececf2] shrink-0 shadow-2xs"
          />
        ) : (
          <div className="size-12 rounded-full bg-gradient-to-br from-[#7c2ae8] to-[#9333ea] text-white font-bold grid place-items-center text-[13px] shrink-0 shadow-2xs">
            {speaker.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-[14.5px] font-bold text-[#171730] truncate">{speaker.name}</h4>
          <p className="text-[11.5px] text-[#5f5f7a] mt-0.5 leading-snug line-clamp-2">{speaker.role}</p>
        </div>
      </div>

      {speaker.bio && (
        <p className="text-[11px] text-[#71718a] leading-relaxed line-clamp-4 bg-[#fafafc] p-2.5 rounded-xl border border-[#f0f0f5]">
          {speaker.bio}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {speaker.links?.website && <PillLink href={speaker.links.website}>Website</PillLink>}
        {speaker.links?.x && <PillLink href={speaker.links.x}>𝕏</PillLink>}
        {speaker.links?.linkedin && <PillLink href={speaker.links.linkedin}>LinkedIn</PillLink>}
        {telegram && <PillLink href={`https://t.me/${encodeURIComponent(telegram)}`}>Telegram</PillLink>}
      </div>
    </div>
  );
}

function PillLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-[#e2e2ec] bg-white px-2.5 py-1 text-[11px] font-medium text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730] transition-colors"
    >
      <span>{children}</span>
      <span className="text-[10px]">↗</span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Quiz modal
// ---------------------------------------------------------------------------

function HintButton({ hint, onRewatch }: { hint: QuizHint; onRewatch?: (hint: QuizHint) => void }) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-[#d97706]">{hint.timestamp}</span>
        <span className="text-[#171730]">{hint.title || "Rewatch this part of the session"}</span>
      </div>
      {onRewatch && <span className="text-[#d97706] font-bold">›</span>}
    </>
  );
  const className =
    "flex w-full items-center justify-between rounded-lg border border-[#fde68a] bg-white px-3 py-2 text-[11px] font-medium text-[#92400e] shadow-2xs";
  return onRewatch ? (
    <button type="button" onClick={() => onRewatch(hint)} className={`${className} hover:bg-[#fffdf5] cursor-pointer`}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

function QuizModal({
  module,
  quiz,
  onClose,
  onFinished,
  onRewatch,
}: {
  module: ModuleItem;
  quiz: QuizData;
  onClose: () => void;
  /** Called after an attempt ends, so the page can refresh its data */
  onFinished: (result: QuizAttemptResult) => void;
  /** Present only when there is a recording to jump into */
  onRewatch?: (hint: QuizHint) => void;
}) {
  const router = useRouter();
  const questions = quiz.questions;

  const [feedback, setFeedback] = useState<Record<number, QuizAnswerFeedback>>(() =>
    Object.fromEntries((quiz.currentAttempt?.answers ?? []).map((a) => [a.questionNumber, a])),
  );
  const [index, setIndex] = useState(() => {
    const answered = new Set((quiz.currentAttempt?.answers ?? []).map((a) => a.questionNumber));
    const firstOpen = questions.findIndex((q) => !answered.has(q.questionNumber));
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [attemptNumber, setAttemptNumber] = useState(
    quiz.currentAttempt?.attemptNumber ?? quiz.attemptsUsed + 1,
  );
  const [pendingOption, setPendingOption] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendingOption) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pendingOption]);

  const question = questions[index];
  const current = question ? feedback[question.questionNumber] : undefined;
  const isLast = index >= questions.length - 1;
  const partner = module.partnerName || module.companyTag;

  const choose = async (key: "A" | "B" | "C" | "D") => {
    if (!question || current || pendingOption) return;
    setPendingOption(key);
    setError(null);
    try {
      const res = await quizApi.answer(module.slug, question.questionNumber, key);
      setAttemptNumber(res.attemptNumber);
      setFeedback((prev) => ({ ...prev, [res.questionNumber]: res }));
      if (res.result) {
        setResult(res.result);
        onFinished(res.result);
      }
    } catch (err) {
      setError(errorMessage(err, "We couldn’t save that answer. Please try again."));
      // The server may know better (e.g. the question was already answered)
      if (err instanceof ApiErrorResponse && err.statusCode === 409) onClose();
    } finally {
      setPendingOption(null);
    }
  };

  const retry = () => {
    setResult(null);
    setFeedback({});
    setIndex(0);
    setAttemptNumber((n) => n + 1);
  };

  // ── Result screen ──
  if (result) {
    const shareText = `I just earned the "${result.badgeEarned?.name ?? quiz.badge.name}" badge in the Si Her DeFi cohort 🎉`;
    return (
      <Overlay labelledBy="quiz-result-title">
        {result.passed ? (
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetPath(result.badgeEarned?.image ?? quiz.badge.image)}
              alt=""
              className="mx-auto my-2 size-[84px] object-contain drop-shadow-[0_10px_20px_rgba(124,42,232,0.35)]"
            />
            <h3 id="quiz-result-title" className="mt-4 text-[21px] font-bold text-[#171730]">
              Badge earned
            </h3>
            <p className="mt-2 text-[12px] leading-relaxed text-[#5f5f7a] max-w-xs mx-auto">
              {result.badgeEarned?.name ?? quiz.badge.name} is yours. It’s on your dashboard now and counts toward the
              certificate you mint at the end of the cohort.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1 text-[11px] font-semibold text-[#16a34a]">
                ✓ {result.score} of {result.totalQuestions} correct
              </span>
              {result.certificateUnlocked && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eedffe] bg-[#f4effe] px-3 py-1 text-[11px] font-semibold text-[#7c2ae8]">
                  Certificate unlocked
                </span>
              )}
            </div>
            <div className="mt-6 space-y-2.5">
              {result.certificateUnlocked ? (
                <button
                  type="button"
                  onClick={() => router.push("/certificate")}
                  className="w-full rounded-xl bg-gradient-to-r from-[#5b1ea6] via-[#7526dd] to-[#8a33ea] py-3 text-[13px] font-semibold text-white shadow-md shadow-purple-950/20 transition hover:brightness-105 cursor-pointer"
                >
                  View your certificate →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="w-full rounded-xl bg-gradient-to-r from-[#5b1ea6] via-[#7526dd] to-[#8a33ea] py-3 text-[13px] font-semibold text-white shadow-md shadow-purple-950/20 transition hover:brightness-105 cursor-pointer"
                >
                  Back to dashboard →
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#e2e2ec] py-2.5 text-[12px] font-semibold text-[#5f5f7a] hover:bg-gray-50 transition cursor-pointer"
                >
                  Back to module
                </button>
                <a
                  href={linkedInShareUrl(shareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#f4effe] py-2.5 text-center text-[12px] font-semibold text-[#7c2ae8] transition hover:bg-[#ede5fc]"
                >
                  Share on LinkedIn ↗
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 id="quiz-result-title" className="text-[19px] font-bold text-[#171730]">
              {result.score} of {result.totalQuestions} correct
            </h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#5f5f7a]">
              You need {result.passingScore} to earn the badge.{" "}
              {result.attemptsRemaining > 0
                ? `You have ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? "" : "s"} left — rewatch these parts first:`
                : result.retryAvailableAt
                  ? `That was your last attempt for now. Rewatch these parts — you can try again ${
                      timeUntil(result.retryAvailableAt) ?? "shortly"
                    } (${formatSessionTime(result.retryAvailableAt)}).`
                  : "You’ve used all your attempts. Please reach out to the Si Her team."}
            </p>
            <div className="mt-4 space-y-2">
              {result.review.map((r) => (
                <div key={r.questionNumber} className="rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-3 space-y-2">
                  <p className="text-[11.5px] font-medium text-[#92400e]">
                    Q{r.questionNumber}. {r.questionText}
                  </p>
                  {r.hint && (
                    <HintButton
                      hint={r.hint}
                      onRewatch={
                        onRewatch
                          ? (hint) => {
                              onClose();
                              onRewatch(hint);
                            }
                          : undefined
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-[#f0f0f5] pt-3.5">
              <button
                type="button"
                onClick={onClose}
                className="text-[12px] font-medium text-[#5f5f7a] hover:text-[#171730] cursor-pointer"
              >
                ← Back to module
              </button>
              {result.attemptsRemaining > 0 && (
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-full bg-[#171730] px-4 py-2 text-[12px] font-semibold text-white hover:bg-black cursor-pointer"
                >
                  Try again →
                </button>
              )}
            </div>
          </div>
        )}
      </Overlay>
    );
  }

  if (!question) return null;

  // ── Question screen ──
  return (
    <Overlay labelledBy="quiz-question-title">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate rounded-full bg-[#f4effe] px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[#7c2ae8] uppercase">
          WEEK {pad(module.week)} QUIZ{partner ? ` · ${partner}` : ""}
        </span>
        <span className="shrink-0 text-[9.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">
          ATTEMPT {attemptNumber} OF {quiz.maxAttempts}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-1.5">
          {questions.map((q, i) => {
            const f = feedback[q.questionNumber];
            return (
              <div
                key={q.questionNumber}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  f ? (f.isCorrect ? "bg-[#16a34a]" : "bg-[#ef4444]") : i === index ? "bg-[#7c2ae8]" : "bg-[#ececf2]"
                }`}
              />
            );
          })}
        </div>
        <span className="text-[10px] font-medium text-[#8e8ea6] shrink-0 tabular-nums">
          Question {index + 1} of {questions.length}
        </span>
      </div>

      <h3 id="quiz-question-title" className="mt-5 text-[15px] sm:text-[15.5px] font-bold text-[#171730] leading-snug">
        {question.questionText}
      </h3>

      <div className="mt-4 space-y-2.5" role="radiogroup" aria-labelledby="quiz-question-title">
        {question.options.map((opt) => {
          const isChosen = current?.selectedOption === opt.key || pendingOption === opt.key;
          let style = "border border-[#ececf2] bg-white hover:border-[#7c2ae8] hover:bg-[#faf8ff]";
          let badge = "border border-[#d8d8e5] text-[#5f5f7a] bg-white";
          let symbol: ReactNode = opt.key;
          if (current && isChosen) {
            style = current.isCorrect
              ? "border-2 border-[#16a34a] bg-[#f0fdf4]"
              : "border-2 border-[#ef4444] bg-[#fef2f2]";
            badge = current.isCorrect ? "bg-[#16a34a] text-white" : "bg-[#ef4444] text-white";
            symbol = current.isCorrect ? "✓" : "✕";
          } else if (current) {
            style = "border border-[#ececf2] bg-white opacity-60";
          } else if (isChosen) {
            style = "border-2 border-[#7c2ae8] bg-[#faf8ff]";
          }

          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={!!current || !!pendingOption}
              onClick={() => choose(opt.key)}
              className={`w-full rounded-xl p-3 flex items-center justify-between gap-3 text-left transition-all cursor-pointer disabled:cursor-default ${style}`}
            >
              <div className="flex items-center gap-3">
                <span className={`grid size-6 place-items-center rounded-full text-[11px] font-semibold shrink-0 ${badge}`}>
                  {symbol}
                </span>
                <span className="text-[12px] font-medium text-[#171730]">{opt.text}</span>
              </div>
              {current && isChosen && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                    current.isCorrect ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#dc2626]"
                  }`}
                >
                  {current.isCorrect ? "Correct" : "Not quite"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {current?.isCorrect && current.explanation && (
        <div className="mt-4 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3.5 text-[11.5px] leading-relaxed text-[#166534] flex items-start gap-2.5">
          <span className="font-bold text-[13px] text-[#16a34a]">✓</span>
          <span>{current.explanation}</span>
        </div>
      )}

      {current && !current.isCorrect && (
        <div className="mt-4 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-3.5 text-[11.5px] text-[#92400e] space-y-2">
          <p className="leading-snug">
            ⚡ Your answer is locked for this attempt. Worth another look at the session before your next try:
          </p>
          {current.hint && <HintButton hint={current.hint} />}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[12px] font-medium text-red-500">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-[#f0f0f5] pt-3.5">
        <button
          type="button"
          onClick={onClose}
          disabled={!!pendingOption}
          className="text-[11.5px] font-medium text-[#5f5f7a] hover:text-[#171730] cursor-pointer disabled:opacity-50"
        >
          ← Close
        </button>
        <span className="text-[10.5px] text-[#8e8ea6]">
          {pendingOption ? "Checking…" : current ? "Answer locked" : "Choose an answer — it locks once picked"}
        </span>
        <button
          type="button"
          disabled={!current || isLast}
          onClick={() => setIndex((i) => i + 1)}
          className="rounded-full px-4 py-2 text-[12px] font-semibold transition-all shadow-xs bg-[#171730] text-white hover:bg-black cursor-pointer disabled:cursor-not-allowed disabled:bg-[#e2e2ec] disabled:text-[#a0a0b2]"
        >
          Next question →
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171730]/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative w-full max-w-[500px] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-[#ececf2] animate-in fade-in zoom-in-95 duration-200"
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; module: ModuleItem };

export default function ModuleView({ slug }: { slug: string }) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const videoRef = useRef<SessionVideoHandle | null>(null);

  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [allModules, setAllModules] = useState<ModuleItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [calendarSession, setCalendarSession] = useState<SessionData | null>(null);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const scheduledSessions = useScheduledSessions();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;

    // Modules open only after Si Her Onboard – Part 1
    onboardApi
      .getStatus()
      .then((status) => {
        if (!cancelled && !status.part1Done) router.replace("/onboard");
      })
      .catch(() => {
        // Leave it to the server: quiz answers are refused without Part 1
      });

    Promise.allSettled([modulesApi.getOne(slug), quizApi.getQuiz(slug), modulesApi.getAll()]).then(
      ([moduleRes, quizRes, allRes]) => {
        if (cancelled) return;
        if (moduleRes.status === "rejected") {
          const err = moduleRes.reason;
          setLoad({
            status: "error",
            notFound: err instanceof ApiErrorResponse && err.statusCode === 404,
            message: errorMessage(err, "We couldn’t load this module. Please try again."),
          });
          return;
        }
        // Reached through an older link → show the module's current URL
        if (moduleRes.value.slug !== slug) router.replace(modulePath(moduleRes.value));
        setLoad({ status: "ready", module: moduleRes.value });
        // No quiz published yet → 404 → treated as "coming soon"
        setQuiz(quizRes.status === "fulfilled" ? quizRes.value : null);
        if (allRes.status === "fulfilled") setAllModules(allRes.value);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [router, slug, reloadKey]);

  // React Compiler memoizes these; no manual useCallback needed
  const refresh = () => setReloadKey((k) => k + 1);
  // Re-read the quiz on close so a half-finished attempt resumes where it stopped
  const closeQuiz = () => {
    setQuizOpen(false);
    refresh();
  };

  const onQuizFinished = (result: QuizAttemptResult) => {
    // Keep the sidebar's certificate link in step without a reload
    if (result.certificateUnlocked) moduleCompletedStore.set(true);
    refresh();
  };

  if (load.status !== "ready") {
    return (
      <Frame collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)}>
        {load.status === "loading" ? (
          <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading module">
            <div className="h-8 w-2/3 rounded bg-[#ececf2]" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="aspect-video rounded-2xl bg-[#ececf2] lg:col-span-8" />
              <div className="h-80 rounded-2xl bg-[#ececf2] lg:col-span-4" />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#ececf2] bg-white p-8 text-center shadow-xs">
            <p className="text-[14px] font-semibold text-[#171730]">
              {load.notFound ? "We couldn’t find that module." : load.message}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {!load.notFound && (
                <button
                  type="button"
                  onClick={() => {
                    setLoad({ status: "loading" });
                    refresh();
                  }}
                  className="rounded-full bg-[#171730] px-5 py-2 text-[12.5px] font-bold text-white hover:bg-black cursor-pointer"
                >
                  Try again
                </button>
              )}
              <Link
                href="/dashboard"
                className="rounded-full border border-[#e2e2ec] px-5 py-2 text-[12.5px] font-semibold text-[#171730] hover:bg-gray-50"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        )}
      </Frame>
    );
  }

  const { module } = load;
  const companies = formatCompanyList([
    ...new Set([module.partnerName, ...module.speakers.map((s) => s.companyName)].filter(Boolean)),
  ]);
  const hasRecording = module.sessionState === "recorded" && !!module.videoUrl;
  const next = [...allModules].sort((a, b) => a.week - b.week).find((m) => m.week > module.week) ?? null;
  const nextWhen = next ? formatSessionTime(next.scheduledDate) : null;

  const seekTo = (timestamp: string) => videoRef.current?.seekTo(timestampToSeconds(timestamp));
  const shareText = quiz?.isPassed
    ? `I just earned the "${quiz.badge.name}" badge in the Si Her DeFi cohort 🎉`
    : `I'm learning "${module.title}" in the Si Her DeFi cohort${companies ? ` with ${companies}` : ""}.`;

  return (
    <Frame collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} weekLabel={module.dateLabel}>
      <div>
        <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-[#171730]">{module.title}</h1>
        {companies && <p className="mt-1 text-[13px] text-[#5f5f7a]">With {companies}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: media, about, chapters, next up */}
        <div className="space-y-6 lg:col-span-8">
          <SessionMedia module={module} videoRef={videoRef} />

          {(module.description || module.aboutText.length > 0) && (
            <div className="rounded-2xl border border-[#ececf2] bg-white p-6 shadow-2xs space-y-3">
              <h3 className="text-[11px] font-bold tracking-wider text-[#8e8ea6] uppercase">ABOUT THIS MODULE</h3>
              {module.description && (
                <p className="text-[12.5px] leading-relaxed text-[#5f5f7a]">{module.description}</p>
              )}
              {module.aboutText.map((paragraph, i) => (
                <p key={i} className="text-[12.5px] leading-relaxed text-[#5f5f7a]">
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {module.chapters.length > 0 && (
            <div className="rounded-2xl border border-[#ececf2] bg-white p-6 shadow-2xs space-y-3">
              <h3 className="text-[11px] font-bold tracking-wider text-[#8e8ea6] uppercase">IN THIS SESSION</h3>
              <div className="divide-y divide-[#f0f0f5]">
                {module.chapters.map((chapter, idx) => {
                  const row = (
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[12px] text-[#8e8ea6] w-12">{chapter.time}</span>
                      <span className="text-[13px]">{chapter.title}</span>
                    </div>
                  );
                  return hasRecording ? (
                    <button
                      key={`${chapter.time}-${idx}`}
                      type="button"
                      onClick={() => {
                        setActiveChapter(idx);
                        seekTo(chapter.time);
                      }}
                      className={`group flex w-full items-center justify-between py-3 text-left transition-colors cursor-pointer ${
                        activeChapter === idx ? "text-[#7c2ae8] font-semibold" : "text-[#171730] hover:text-[#7c2ae8]"
                      }`}
                    >
                      {row}
                      <span className="text-[14px] text-[#b0b0c2] group-hover:text-[#7c2ae8]">›</span>
                    </button>
                  ) : (
                    <div key={`${chapter.time}-${idx}`} className="py-3 text-[#171730]">
                      {row}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {quiz?.lastResult && !quiz.isPassed && quiz.lastResult.review.some((r) => r.hint) && (
            <div className="rounded-2xl border border-[#fef3c7] bg-[#fffbeb] p-5 space-y-2">
              <h3 className="text-[11px] font-bold tracking-wider text-[#b45309] uppercase">WORTH A REWATCH</h3>
              {quiz.lastResult.review
                .filter((r) => r.hint)
                .map((r) => (
                  <HintButton
                    key={r.questionNumber}
                    hint={r.hint!}
                    onRewatch={hasRecording ? (hint) => seekTo(hint.timestamp) : undefined}
                  />
                ))}
            </div>
          )}

          {next && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[12px]">
              <span className="text-[#5f5f7a]">
                Next up:{" "}
                <Link href={modulePath(next)} className="font-semibold text-[#171730] hover:text-[#7c2ae8]">
                  {next.title}
                </Link>
                {nextWhen ? ` — ${nextWhen}` : ""}
              </span>
              {next.sessionState === "upcoming" && next.scheduledDate && (
                <button
                  type="button"
                  onClick={() => setCalendarSession(sessionData(next))}
                  className="font-semibold text-[#7c2ae8] hover:underline cursor-pointer"
                >
                  {scheduledSessions[next.slug] || next.isScheduled ? "Added to calendar ✓" : "Add to calendar ↗"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: quiz, speakers, share */}
        <div className="space-y-5 lg:col-span-4">
          <QuizCard module={module} quiz={quiz} onStart={() => setQuizOpen(true)} />

          {module.speakers.length > 0 && (
            <div className="space-y-3">
              <h3 className="px-1 text-[11px] font-bold tracking-wider text-[#8e8ea6] uppercase">
                SPEAKERS ({module.speakers.length})
              </h3>
              <div className="space-y-3">
                {module.speakers.map((speaker, idx) => (
                  <SpeakerCard key={speaker.id || `${speaker.name}-${idx}`} speaker={speaker} />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[#ececf2] bg-white p-5 shadow-2xs space-y-3">
            <h4 className="text-[13px] font-bold text-[#171730]">Share your progress</h4>
            <p className="text-[11.5px] leading-relaxed text-[#8e8ea6]">It doesn’t affect your badge or certificate.</p>
            <a
              href={linkedInShareUrl(shareText)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl border border-[#e2e2ec] py-2 text-center text-[12px] font-semibold text-[#171730] transition hover:bg-gray-50"
            >
              Share on LinkedIn ↗
            </a>
          </div>
        </div>
      </div>

      {quizOpen && quiz && (
        <QuizModal
          module={module}
          quiz={quiz}
          onClose={closeQuiz}
          onFinished={onQuizFinished}
          onRewatch={hasRecording ? (hint) => seekTo(hint.timestamp) : undefined}
        />
      )}

      <ScheduleSessionModal
        isOpen={!!calendarSession}
        onClose={() => setCalendarSession(null)}
        session={calendarSession}
        onScheduled={(session, provider) => {
          // Remember it on the account too, so "Added ✓" shows on every device
          modulesApi.schedule(session.id, calendarTypeFor(provider)).catch(() => {});
        }}
      />
    </Frame>
  );
}

function Frame({
  collapsed,
  onToggle,
  weekLabel,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  weekLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8f8fc] font-sans antialiased text-[#171730]">
      <DashboardSidebar collapsed={collapsed} onToggle={onToggle} />
      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 sm:py-8 overflow-y-auto">
        <div className="mx-auto max-w-[1040px] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#7c2ae8] transition-colors hover:underline"
            >
              ← Back to dashboard
            </Link>
            {weekLabel && (
              <span className="text-[11px] font-semibold tracking-wider text-[#8e8ea6] uppercase">{weekLabel}</span>
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
