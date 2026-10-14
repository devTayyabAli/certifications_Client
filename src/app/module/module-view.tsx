'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { ScheduleModal } from '@/components/dashboard/ScheduleModal';
import { Button, ButtonLink } from '@/components/ui/Button';
import { HintButton, QuizDialog } from '@/components/module/QuizDialog';
import { VideoPlayer, toSeconds, type PlayerHandle } from '@/components/module/VideoPlayer';
import { Arrow } from '@/components/ui/Arrow';
import { Check } from '@/components/ui/Check';
import { useCertificateUnlocked } from '@/lib/cohort-progress';
import { dayTime, timeUntil } from '@/lib/format';
import {
  modulesApi,
  onboardApi,
  quizApi,
  type ModuleItem,
  type QuizData,
  type QuizHint,
  type SpeakerItem,
} from '@/lib/api';

const card = 'rounded-2xl border border-[#ececf2] bg-white p-5 sm:p-6 shadow-2xs space-y-4';
const share = (text: string) =>
  `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;

/** Skipped quiz: start it over (fresh attempts) and open it straight away. */
function TakeAgainButton({ onRestart }: { onRestart: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        loading={busy}
        loadingLabel="Starting over…"
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await onRestart();
          } catch (e) {
            setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
          } finally {
            setBusy(false);
          }
        }}
      >
        Take the quiz again
      </Button>
      {error && (
        <p role="alert" className="text-[12px] text-red-500">
          {error}
        </p>
      )}
    </>
  );
}

/** All attempts used without passing: start over, or skip this week's quiz (no badge). */
function OutOfAttempts({
  m,
  quiz,
  onRestart,
  onSkip,
}: {
  m: ModuleItem;
  quiz: QuizData;
  onRestart: () => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'restart' | 'skip' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = quiz.lastResult;

  const run = async (kind: 'restart' | 'skip', action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[#ececf2] bg-white p-5 sm:p-6 space-y-4">
      <span className="text-[11.5px] font-medium text-[#7c2ae8]">Out of attempts</span>
      <div>
        <h4 className="text-[16.5px] font-medium text-[#171730]">Not quite this time</h4>
        <p className="mt-1.5 text-[12.5px] leading-5 text-[#5f5f7a]">
          You’ve used all {quiz.maxAttempts} attempts
          {last ? ` (last: ${last.score} of ${last.totalQuestions})` : ''}. That’s okay. Rewatch the
          session and start over, or skip this quiz and keep going.
        </p>
      </div>
      {confirming ? (
        <div className="space-y-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3.5">
          <p className="text-[12.5px] leading-5 text-[#92400e]">
            If you skip, you won’t earn this module’s badge. It still counts as done for your
            certificate, and you can take the quiz again later.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="md"
              showIcon={false}
              loading={busy === 'skip'}
              loadingLabel="Skipping…"
              disabled={!!busy}
              onClick={() => run('skip', onSkip)}
            >
              Skip without the badge
            </Button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => setConfirming(false)}
              className="link-cta text-[12.5px] font-medium text-[#7c2ae8]"
            >
              Keep trying
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <Button
            loading={busy === 'restart'}
            loadingLabel="Starting over…"
            disabled={!!busy}
            onClick={() => run('restart', onRestart)}
          >
            Start over
          </Button>
          <div className="text-center">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => setConfirming(true)}
              className="link-cta text-[12.5px] font-medium text-[#5f5f7a]"
            >
              Skip this quiz
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function QuizCard({
  m,
  quiz,
  part1Done,
  certificateUnlocked,
  onStart,
  onRestart,
  onSkip,
}: {
  m: ModuleItem;
  quiz: QuizData | null;
  part1Done: boolean;
  certificateUnlocked: boolean;
  onStart: () => void;
  onRestart: () => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  if (!quiz) {
    return (
      <div className={card}>
        <span className="text-[11.5px] font-medium text-[#8e8ea6]">Quiz coming soon</span>
        <div>
          <h4 className="text-[16.5px] font-medium text-[#171730]">Earn this module’s badge</h4>
          <p className="mt-1.5 text-[12.5px] leading-5 text-[#5f5f7a]">
            This module’s quiz isn’t published yet. Check back after the session.
          </p>
        </div>
      </div>
    );
  }

  if (quiz.isPassed) {
    return (
      <div className={card}>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[12px] font-medium text-[#16a34a]">
            <Check className="size-3.5" /> Completed
          </span>
        </div>
        <div className="flex items-center gap-4 pb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="size-14 shrink-0 object-contain drop-shadow-[0_6px_12px_rgba(124,42,232,0.25)]"
            src={quiz.badge.image}
          />
          <div className="min-w-0">
            <h4 className="text-[16px] font-medium text-[#171730]">Badge earned</h4>
            <p className="mt-0.5 text-[12.5px] text-[#5f5f7a]">{quiz.badge.name}</p>
          </div>
        </div>
        {certificateUnlocked ? (
          <ButtonLink href="/certificate">View your certificate</ButtonLink>
        ) : (
          <ButtonLink href="/dashboard" variant="primary">
            Back to dashboard
          </ButtonLink>
        )}
      </div>
    );
  }

  if (!quiz.isOpen) {
    return (
      <div className={card}>
        <span className="text-[11.5px] font-medium text-[#8e8ea6]">Opens after session</span>
        <div>
          <h4 className="text-[16.5px] font-medium text-[#171730]">Earn this module’s badge</h4>
          <p className="mt-1.5 text-[12.5px] leading-5 text-[#5f5f7a]">
            The quiz opens after the live session{m.scheduledDate ? ` on ${dayTime(m.scheduledDate)}` : ''}.
          </p>
        </div>
      </div>
    );
  }

  if (quiz.isSkipped) {
    return (
      <div className={card}>
        <span className="text-[11.5px] font-medium text-[#8e8ea6]">Skipped</span>
        <div>
          <h4 className="text-[16.5px] font-medium text-[#171730]">No badge for this module</h4>
          <p className="mt-1.5 text-[12.5px] leading-5 text-[#5f5f7a]">
            You skipped this quiz, so it counts as done for your certificate but without the badge.
            Want the badge after all? You can take it again any time.
          </p>
        </div>
        <TakeAgainButton onRestart={onRestart} />
      </div>
    );
  }

  const outOfAttempts = quiz.attemptsRemaining <= 0 && !quiz.currentAttempt;
  if (outOfAttempts) {
    return <OutOfAttempts m={m} quiz={quiz} onRestart={onRestart} onSkip={onSkip} />;
  }

  const retry = !!quiz.lastResult && !quiz.lastResult.passed;
  return (
    <div className={card}>
      <span className="text-[11.5px] font-medium text-[#7c2ae8]">Ready when you are</span>
      <div>
        <h4 className="text-[16.5px] font-medium text-[#171730]">Earn this module’s badge</h4>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#5f5f7a]">
          Answer all {quiz.totalQuestions} correctly to earn the badge. {quiz.maxAttempts} attempts —
          if you don’t pass, rewatch and retry.
        </p>
      </div>
      <ul className="space-y-2.5 text-[12px] text-[#5f5f7a]">
        <li className="flex items-center gap-2.5">
          <span className="grid size-4 place-items-center rounded border border-[#b8b8cc] text-[#5f5f7a]">
            <Check className="size-3" />
          </span>
          <span>
            {quiz.totalQuestions} questions · all {quiz.passingScore} correct
          </span>
        </li>
        <li className="flex items-center gap-2.5">
          <span className="grid size-4 place-items-center text-[12px] text-[#8e8ea6]">★</span>
          <span>
            Attempt {Math.min(quiz.attemptsUsed + 1, quiz.maxAttempts)} of {quiz.maxAttempts}
          </span>
        </li>
      </ul>
      {retry && quiz.lastResult && (
        <p className="rounded-xl bg-[#fffbeb] p-3 text-[11.5px] text-[#92400e]">
          Last attempt: {quiz.lastResult.score} of {quiz.lastResult.totalQuestions}. Review the hints
          below the video, then try again.
        </p>
      )}
      {part1Done ? (
        <Button onClick={onStart}>
          {retry ? 'Try again' : quiz.currentAttempt ? 'Resume quiz' : 'Start quiz'}
        </Button>
      ) : (
        <ButtonLink href="/onboard">Finish Part 1 to unlock</ButtonLink>
      )}
    </div>
  );
}

/**
 * A speaker's bio: four lines, then "Read more" when there's more. The padding
 * sits on the box and the clamp on the text inside it, so a cut-off fifth line
 * never peeks out under the fourth.
 */
function SpeakerBio({ bio }: { bio: string }) {
  const text = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  useEffect(() => {
    const el = text.current;
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1);
  }, [bio, open]);
  return (
    <div className="rounded-xl border border-[#f0f0f5] bg-[#fafafc] p-2.5">
      <p
        ref={text}
        className={`whitespace-pre-line break-words text-[11px] leading-relaxed text-[#71718a] ${open ? "" : "line-clamp-4"}`}
      >
        {bio}
      </p>
      {(long || open) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="link-cta mt-1 text-[11px] font-medium text-[#7c2ae8]"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function SpeakerCard({ s }: { s: SpeakerItem }) {
  const telegram = s.telegramHandle?.replace(/^@/, '');
  return (
    <div className="rounded-2xl border border-[#ececf2] bg-white p-4 sm:p-5 shadow-2xs space-y-3.5 transition-all hover:border-[#dcdce8]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="rounded bg-[#f0f0f5] px-2 py-0.5 text-[10px] font-medium text-[#5f5f7a]">
          {s.companyTag || 'SPEAKER'}
        </span>
        <span className="text-[12px] font-medium text-[#171730]">{s.companyName}</span>
      </div>
      <div className="flex items-start gap-3">
        {s.headshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={s.name}
            className="size-12 rounded-full object-cover border border-[#ececf2] shrink-0 shadow-2xs"
            src={s.headshotUrl}
          />
        ) : (
          <div className="size-12 rounded-full bg-gradient-to-br from-[#7c2ae8] to-[#9333ea] text-white font-medium grid place-items-center text-[13px] shrink-0 shadow-2xs">
            {s.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-[14.5px] font-medium text-[#171730] truncate">{s.name}</h4>
          <p className="text-[11.5px] text-[#5f5f7a] mt-0.5 leading-snug line-clamp-2">{s.role}</p>
        </div>
      </div>
      {s.bio && <SpeakerBio bio={s.bio} />}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {s.links?.website && (
          <a
            href={s.links.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-[#e2e2ec] bg-white px-2.5 py-1 text-[11px] font-medium text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730] transition-colors"
          >
            <span>Website</span>
            <Arrow dir="up-right" />
          </a>
        )}
        {s.links?.x && (
          <a
            href={s.links.x}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-[#e2e2ec] bg-white px-2.5 py-1 text-[11px] font-medium text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730] transition-colors"
          >
            <span>𝕏</span>
            <Arrow dir="up-right" />
          </a>
        )}
        {s.links?.linkedin && (
          <a
            href={s.links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-[#e2e2ec] bg-white px-2.5 py-1 text-[11px] font-medium text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730] transition-colors"
          >
            <span>LinkedIn</span>
            <Arrow dir="up-right" />
          </a>
        )}
        {telegram && (
          <a
            href={`https://t.me/${encodeURIComponent(telegram)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-[#e2e2ec] bg-white px-2.5 py-1 text-[11px] font-medium text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730] transition-colors"
          >
            <span>Telegram</span>
            <Arrow dir="up-right" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function ModuleView({ slug }: { slug: string }) {
  const certificateUnlocked = useCertificateUnlocked();
  const [m, setM] = useState<ModuleItem | null>(null);
  const [all, setAll] = useState<ModuleItem[]>([]);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [part1Done, setPart1Done] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [scheduling, setScheduling] = useState<ModuleItem | null>(null);
  const player = useRef<PlayerHandle>(null);

  const load = useCallback(async () => {
    try {
      const [mod, list, q, st] = await Promise.all([
        modulesApi.getOne(slug),
        modulesApi.getAll(),
        quizApi.getQuiz(slug).catch(() => null),
        onboardApi.getStatus().catch(() => ({ part1Done: true })),
      ]);
      setM(mod);
      setAll(list.sort((a, b) => a.week - b.week));
      setQuiz(q);
      setPart1Done(st.part1Done);
    } catch {
      setNotFound(true);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (notFound) {
    return (
      <AppShell>
        <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center text-center">
          <div>
            <p className="text-[18px] font-medium text-[#171730]">We couldn’t find that module</p>
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-[12.5px] font-medium text-[#7c2ae8] link-cta"
            >
              <Arrow dir="left" /> Back to dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!m) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1040px] space-y-6 animate-pulse">
          <div className="h-4 w-32 rounded bg-[#ececf2]" />
          <div className="h-8 w-2/3 rounded bg-[#ececf2]" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="aspect-video rounded-2xl bg-[#ececf2] lg:col-span-8" />
            <div className="h-80 rounded-2xl bg-[#ececf2] lg:col-span-4" />
          </div>
        </div>
      </AppShell>
    );
  }

  const upcoming = m.sessionState === 'upcoming';
  const rewatch = (h: QuizHint) => player.current?.seek(toSeconds(h.timestamp));
  const review =
    quiz && !quiz.isPassed ? quiz.lastResult?.review.filter((r) => r.hint) ?? [] : [];
  const shareText =
    quiz && quiz.isPassed
      ? `I just earned the "${quiz.badge.name}" badge in the Si Her DeFi cohort 🎉`
      : `I'm learning "${m.title}" in the Si Her DeFi cohort${
          m.partnerName && m.partnerName !== 'Si Her DeFi' ? ` with ${m.partnerName}` : ''
        }.`;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1040px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#7c2ae8] transition-colors link-cta"
            href="/dashboard"
          >
            <Arrow dir="left" /> Back to dashboard
          </Link>
          <span className="text-[11px] font-medium text-[#8e8ea6]">{m.dateLabel}</span>
        </div>

        <div>
          <h1 className="text-[26px] sm:text-[28px] font-medium tracking-tight text-[#171730]">
            {m.title}
          </h1>
          {m.partnerName && m.partnerName !== 'Si Her DeFi' && (
            <p className="mt-1 text-[13px] text-[#5f5f7a]">With {m.partnerName}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Media, About, Chapters, Hints */}
          <div className="space-y-6 lg:col-span-8">
            {!upcoming && m.videoUrl ? (
              <VideoPlayer
                ref={player}
                src={m.videoUrl}
                poster={m.thumbnailUrl}
                label={`${m.companyTag} · Session recording`}
              />
            ) : (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#17142b] via-[#331c4b] to-[#121124] shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {(m.bannerUrl || m.thumbnailUrl) && (
                  <img
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                    src={(m.bannerUrl || m.thumbnailUrl)!}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45" />
                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                    <span>{m.companyTag}</span>
                    <span className="text-white/40">·</span>
                    <span>
                      {upcoming
                        ? 'Upcoming session'
                        : m.sessionState === 'live'
                          ? 'Live now'
                          : 'Recording coming soon'}
                    </span>
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-3 p-5">
                  <div className="space-y-1">
                    <p className="text-[14px] font-medium text-white">
                      Live {m.scheduledDate ? dayTime(m.scheduledDate) : 'TBD'}
                    </p>
                    {upcoming && m.scheduledDate && (
                      <p className="text-[12px] text-white/75">
                        Starts {timeUntil(m.scheduledDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {m.sessionState === 'live' && m.liveLink && (
                      <ButtonLink href={m.liveLink} external variant="white" size="md">
                        Join live session
                      </ButtonLink>
                    )}
                    {upcoming && (
                      <button
                        type="button"
                        onClick={() => setScheduling(m)}
                        className="rounded-xl border border-white/30 bg-white/10 px-3.5 py-2 text-[12px] font-medium text-white backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
                      >
                        Add to calendar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[#ececf2] bg-white p-6 shadow-2xs space-y-3">
              <h3 className="text-[11px] font-medium text-[#8e8ea6]">About this module</h3>
              <p className="text-[12.5px] leading-relaxed text-[#5f5f7a]">{m.description}</p>
              {m.aboutText?.map((p, i) => (
                <p key={i} className="text-[12.5px] leading-relaxed text-[#5f5f7a]">
                  {p}
                </p>
              ))}
            </div>

            {!upcoming && m.chapters && m.chapters.length > 0 && (
              <div className="rounded-2xl border border-[#ececf2] bg-white p-6 shadow-2xs space-y-3">
                <h3 className="text-[11px] font-medium text-[#8e8ea6]">In this session</h3>
                <div className="divide-y divide-[#f0f0f5]">
                  {m.chapters.map((c) => (
                    <button
                      key={c.time}
                      type="button"
                      onClick={() => player.current?.seek(toSeconds(c.time))}
                      className="group flex w-full items-center justify-between py-3 text-left transition-colors cursor-pointer text-[#171730] hover:text-[#7c2ae8]"
                    >
                      <div className="flex items-center gap-4">
                        <span className="tabular-nums text-[12px] text-[#8e8ea6] w-12">{c.time}</span>
                        <span className="text-[13px]">{c.title}</span>
                      </div>
                      <span className="text-[14px] text-[#b0b0c2] group-hover:text-[#7c2ae8]">›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {review.length > 0 && (
              <div className="rounded-2xl border border-[#fef3c7] bg-[#fffbeb] p-5 space-y-2">
                <h3 className="text-[11px] font-medium text-[#b45309]">Worth a rewatch</h3>
                {review.map((r) => (
                  <HintButton key={r.questionNumber} hint={r.hint!} onRewatch={rewatch} />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Quiz, Speakers, Share */}
          <div className="space-y-5 lg:col-span-4">
            <QuizCard
              m={m}
              quiz={quiz}
              part1Done={part1Done}
              certificateUnlocked={certificateUnlocked}
              onStart={() => setQuizOpen(true)}
              onRestart={async () => {
                // a fresh set of attempts, then straight into the quiz
                await quizApi.restart(slug);
                await load();
                setQuizOpen(true);
              }}
              onSkip={async () => {
                await quizApi.skip(slug);
                await load();
              }}
            />

            {m.speakers && m.speakers.length > 0 && (
              <div className="space-y-3">
                <h3 className="px-1 text-[11px] font-medium text-[#8e8ea6]">
                  Speakers ({m.speakers.length})
                </h3>
                <div className="space-y-3">
                  {m.speakers.map((s) => (
                    <SpeakerCard key={s.name} s={s} />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[#ececf2] bg-white p-5 shadow-2xs space-y-3">
              <h4 className="text-[13px] font-medium text-[#171730]">Share your progress</h4>
              <p className="text-[11.5px] leading-relaxed text-[#8e8ea6]">
                It doesn’t affect your badge or certificate.
              </p>
              <a
                href={share(shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl border border-[#e2e2ec] py-2 text-center text-[12px] font-medium text-[#171730] transition hover:bg-gray-50 inline-flex items-center justify-center gap-1.5"
              >
                <span>Share on LinkedIn</span>
                <Arrow dir="up-right" />
              </a>
            </div>
          </div>
        </div>

        {quizOpen && quiz && (
          <QuizDialog
            module={m}
            quiz={quiz}
            next={all.find((x) => x.week > m.week) ?? null}
            onClose={() => {
              setQuizOpen(false);
              load();
            }}
            onFinished={() => load()}
            onRewatch={rewatch}
          />
        )}

        {scheduling && (
          <ScheduleModal
            module={scheduling}
            onClose={() => setScheduling(null)}
            onScheduled={() => load()}
          />
        )}
      </div>
    </AppShell>
  );
}
