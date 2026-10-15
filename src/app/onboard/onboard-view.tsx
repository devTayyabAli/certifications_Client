'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { Button } from '@/components/ui/Button';
import { LabelInput } from '@/components/ui/LabelInput';
import { Arrow } from '@/components/ui/Arrow';
import { Check } from '@/components/ui/Check';
import { IntroVideo, WATCH_THRESHOLD } from '@/components/onboarding/IntroVideo';
import { tagCase } from '@/lib/format';
import {
  ApiErrorResponse,
  onboardApi,
  type OnboardContent,
  type OnboardProgress,
  type OnboardSocial,
} from '@/lib/api';

type StepState = 'done' | 'current' | 'todo';

const VIDEO_TITLE = 'A welcome from Kara Howard';
const VIDEO_DESCRIPTION =
  'Kara Howard, Co-Founder and Ecosystem Lead at SI<3>, welcomes you to the cohort. She covers what Si Her DeFi is, how the weekly sessions and quizzes work, and how you earn your badges and certificate.';

function Step({
  n,
  state,
  title,
  sub,
  children,
}: {
  n: number;
  state: StepState;
  title: string;
  sub: string;
  children?: React.ReactNode;
}) {
  const dot =
    state === 'done'
      ? 'bg-[#16a34a] text-white'
      : state === 'current'
        ? 'bg-[#7c2ae8] text-white'
        : 'border border-[#dcdce8] text-[#8e8ea6]';
  return (
    <div className="flex items-start gap-3">
      <span
        className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-medium mt-0.5 ${dot}`}
      >
        {state === 'done' ? <Check className="size-3.5" strokeWidth={2.4} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[#171730]">{title}</p>
        <p className="text-[11px] text-[#8e8ea6]">{sub}</p>
        {children}
      </div>
    </div>
  );
}

export default function OnboardView() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [content, setContent] = useState<OnboardContent | null>(null);
  const [progress, setProgress] = useState<OnboardProgress | null>(null);

  const [watchFraction, setWatchFraction] = useState(0);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    onboardApi
      .getPart1()
      .then(({ content: c, progress: p }) => {
        setContent(c);
        setProgress(p);
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : 'We couldn’t load onboarding right now. Please try again.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (loading || !content || !progress) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-6">
          {loadError ? (
            <div className="rounded-2xl border border-[#ececf2] bg-white p-8 text-center shadow-xs">
              <p className="text-[14px] font-medium text-[#171730]">{loadError}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-4 rounded-xl bg-[#171730] px-5 py-2 text-[12.5px] font-medium text-white hover:bg-black cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-pulse motion-reduce:animate-none" role="status" aria-busy="true" aria-label="Loading onboarding">
              <div className="h-5 w-40 rounded bg-[#ececf2]" />
              <div className="h-8 w-2/3 rounded bg-[#ececf2]" />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="aspect-video rounded-2xl bg-[#ececf2] lg:col-span-8" />
                <div className="h-80 rounded-2xl bg-[#ececf2] lg:col-span-4" />
              </div>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  const socials = [...content.socials].sort((a, b) => a.order - b.order);
  const questions = [...content.questions].sort((a, b) => a.order - b.order);
  const requiredSocials = socials.filter((s) => s.required);
  const followedSet = new Set(progress.followedSocialIds);
  const followedCount = requiredSocials.filter((s) => followedSet.has(s.id)).length;
  const socialsDone = requiredSocials.every((s) => followedSet.has(s.id));
  const isCompleted = progress.status === 'completed';
  const hasAnswers = Object.values(progress.answers).some((a) => a?.trim());

  const answerPayload = (ansMap: Record<string, string>) =>
    questions.map((q) => ({ questionId: q.id, answerText: ansMap[q.id] ?? '' }));

  const save = async (patch: Partial<OnboardProgress>) => {
    const next: OnboardProgress = { ...progress, ...patch };
    setProgress(next);
    if (!isCompleted) {
      try {
        await onboardApi.saveDraft({
          videoWatched: next.videoWatched,
          followedSocialIds: next.followedSocialIds,
          answers: answerPayload(next.answers),
        });
      } catch {
        // Non-critical, saved locally in state
      }
    }
  };

  const steps: StepState[] = (() => {
    const flags = [progress.videoWatched, socialsDone, isCompleted];
    const firstOpen = flags.findIndex((f) => !f);
    return flags.map((f, i) => (f ? 'done' : i === firstOpen ? 'current' : 'todo'));
  })();

  const currentQ = questionIndex !== null ? questions[questionIndex] : null;
  const currentAnswer = currentQ ? progress.answers[currentQ.id] ?? '' : '';
  const isLast = questionIndex === questions.length - 1;

  const closeQuestions = async () => {
    // Reviewing finished onboarding: nothing to save
    if (isCompleted) {
      setQuestionIndex(null);
      return;
    }
    await save({});
    setQuestionIndex(null);
    setModalError(null);
    setToast('Progress saved — pick up where you left off any time.');
  };

  const submit = async () => {
    setIsBusy(true);
    setModalError(null);
    try {
      await onboardApi.submitPart1({
        videoWatched: progress.videoWatched,
        followedSocialIds: progress.followedSocialIds,
        answers: answerPayload(progress.answers),
      });
      setProgress({ ...progress, status: 'completed' });
      setQuestionIndex(null);
      setDone(true);
    } catch (err: unknown) {
      const fieldErrors =
        err instanceof ApiErrorResponse
          ? ((err.data?.errors ?? []) as { field: string; message: string }[])
          : [];
      const firstQuestionError = fieldErrors.find((e) => questions.some((q) => q.id === e.field));
      if (firstQuestionError) {
        setQuestionIndex(questions.findIndex((q) => q.id === firstQuestionError.field));
        setModalError(firstQuestionError.message);
      } else {
        setModalError(
          fieldErrors[0]?.message ||
            (err instanceof Error ? err.message : 'Couldn’t submit your answers. Please try again.'),
        );
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        {toast && (
          <div
            role="status"
            className="fixed top-5 right-5 z-60 rounded-xl bg-[#171730] px-4 py-2.5 text-[12.5px] font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-3"
          >
            {toast}
          </div>
        )}

        <Link
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#7c2ae8] transition-colors link-cta"
          href="/dashboard"
        >
          <Arrow dir="left" /> Back to dashboard
        </Link>

        <div>
          <h1 className="text-[24px] sm:text-[26px] font-medium tracking-tight text-[#171730]">
            {content.page.title}
          </h1>
          {content.page.subtitle && (
            <p className="mt-1 text-[13px] leading-relaxed text-[#5f5f7a]">
              {content.page.subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Video & Note */}
          <div className="space-y-6 lg:col-span-8">
            <div className="space-y-2">
              <IntroVideo
                url={content.video.url ?? ''}
                title={content.video.caption}
                poster={content.video.posterUrl}
                watched={progress.videoWatched}
                onProgress={setWatchFraction}
                onWatched={() => save({ videoWatched: true })}
              />

              {/* What the video is about, and the watched indicator */}
              <div className="flex flex-col gap-4 rounded-2xl border border-[#ececf2] bg-white p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-[#151534]">{VIDEO_TITLE}</p>
                  <p className="mt-1 text-[12.5px] leading-5 text-[#5f5f7a]">{VIDEO_DESCRIPTION}</p>
                  {content.video.minutes && (
                    <p className="mt-1.5 text-[12px] text-[#8e8ea6]">
                      {content.video.minutes} minutes
                    </p>
                  )}
                </div>
                {progress.videoWatched ? (
                  <span className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 text-[14px] font-medium text-[#16a34a]">
                    <Check className="size-4" />
                    Watched
                  </span>
                ) : (
                  <div
                    className="w-full shrink-0 sm:w-44"
                    role="progressbar"
                    aria-label="Video watched"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(watchFraction * 100)}
                  >
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span className="text-[#5f5f7a]">Watched</span>
                      <span className="font-medium tabular-nums text-[#151534]">
                        {Math.round(watchFraction * 100)}%
                      </span>
                    </div>
                    <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f0f0f6]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#9b4dff] to-[#7c2ae8] transition-[width] duration-500"
                        style={{ width: `${watchFraction * 100}%` }}
                      />
                      <span
                        className="absolute inset-y-0 w-px bg-[#7c2ae8]/40"
                        style={{ left: `${WATCH_THRESHOLD * 100}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-[#8e8ea6]">
                      Watch {Math.round(WATCH_THRESHOLD * 100)}% to unlock the next steps
                    </p>
                  </div>
                )}
              </div>

              {content.taskNote && (
                <div className="flex items-start gap-2.5 rounded-xl bg-[#f0eafb] px-4 py-3 text-[12.5px] leading-5 text-[#5b21b6]">
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-[#7c2ae8]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <circle cx="8" cy="8" r="6.25" />
                    <path d="M8 7.25v3.5M8 5.25h.01" />
                  </svg>
                  <span>{content.taskNote}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Task rail */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-[#ececf2] bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-[11px] font-medium text-[#8e8ea6]">Your task</h3>

              <div className="space-y-4">
                <Step
                  n={1}
                  state={steps[0]}
                  title={content.tasks.video || 'Watch the intro'}
                  sub={`${content.video.minutes ?? 10} minutes · ${progress.videoWatched ? 'watched' : 'start here'}`}
                />

                <Step
                  n={2}
                  state={steps[1]}
                  title={content.tasks.socials || content.socialsHeading || 'Follow us'}
                  sub={`${followedCount} of ${requiredSocials.length} followed · ${
                    requiredSocials.length === 2 ? 'Both required' : 'All required'
                  }`}
                >
                  <div className="mt-2.5 space-y-2">
                    {socials.map((soc) => {
                      const isFollowed = followedSet.has(soc.id);
                      return (
                        <div
                          key={soc.id}
                          className="flex items-center gap-2.5 rounded-xl border border-[#ececf2] bg-[#fbfbfd] p-2"
                        >
                          <span
                            className={`grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-medium text-white ${
                              soc.platform === 'x' ? 'bg-black' : 'bg-[#0077b5]'
                            }`}
                          >
                            {soc.platform === 'x' ? '𝕏' : 'in'}
                          </span>
                          <span
                            className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#45465f]"
                            title={soc.handle}
                          >
                            {soc.platform === 'x' ? 'X' : 'LinkedIn'}
                          </span>
                          {!progress.videoWatched ? (
                            <span
                              className="inline-flex shrink-0 cursor-not-allowed items-center gap-1 rounded-lg border border-[#ece8f4] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#b9aed0]"
                              title="Watch Kara's intro first"
                            >
                              Follow <Arrow dir="up-right" />
                            </span>
                          ) : (
                            <a
                              href={soc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                if (!isFollowed) {
                                  save({
                                    followedSocialIds: [...progress.followedSocialIds, soc.id],
                                  });
                                }
                              }}
                              className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[11.5px] font-medium transition cursor-pointer ${
                                isFollowed
                                  ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]'
                                  : 'border-[#d4c2f5] bg-white text-[#7c2ae8] hover:bg-[#f8f5fe]'
                              }`}
                            >
                              {isFollowed ? (
                                <>
                                  Followed <Check className="size-3.5" />
                                </>
                              ) : (
                                <>
                                  Follow <Arrow dir="up-right" />
                                </>
                              )}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Step>

                <Step
                  n={3}
                  state={steps[2]}
                  title={content.tasks.questions || 'Answer a short set of questions'}
                  sub={`About ${content.questionsMinutes ?? 5} minutes`}
                />
              </div>

              {isCompleted ? (
                // Done: the questions and the learner's answers stay readable
                <Button
                  onClick={() => {
                    setQuestionIndex(0);
                    setModalError(null);
                  }}
                >
                  Review your answers
                </Button>
              ) : (
                <>
                  <Button
                    disabled={!progress.videoWatched || !socialsDone}
                    onClick={() => {
                      const firstOpen = questions.findIndex(
                        (x) => !progress.answers[x.id]?.trim(),
                      );
                      setQuestionIndex(firstOpen === -1 ? 0 : firstOpen);
                      setModalError(null);
                    }}
                  >
                    {hasAnswers ? 'Resume questions' : 'Continue to questions'}
                  </Button>
                  {!(progress.videoWatched && socialsDone) && (
                    <p className="text-center text-[11px] text-[#b45309]">
                      {!progress.videoWatched
                        ? `Watch ${Math.round(WATCH_THRESHOLD * 100)}% of Kara’s intro to unlock the next steps.`
                        : 'Follow both accounts in step 2 to continue.'}
                    </p>
                  )}
                </>
              )}
              {!isCompleted && (
                <p className="text-center text-[11px] font-medium text-[#8e8ea6]">
                  Required before the modules open
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Questions Modal */}
        {currentQ && questionIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="onboard-question-title"
              onKeyDown={(e) => {
                if (e.key === 'Escape' && !isBusy) closeQuestions();
              }}
              className="relative w-full rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-[#ececf2] max-w-lg"
            >
              {/* Close button saves draft answers */}
              <button
                type="button"
                disabled={isBusy}
                onClick={closeQuestions}
                aria-label={isCompleted ? 'Close' : 'Close, your answers are saved'}
                title={isCompleted ? 'Close' : 'Close, your answers are saved'}
                className="absolute -right-3 -top-3 grid size-9 cursor-pointer place-items-center rounded-full border border-[#ececf2] bg-white text-[#5f5f7a] transition hover:text-[#171730] hover:bg-[#f8f8fc] disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>

              <div>
                <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-[#8e8ea6]">
                  <span>{tagCase(content.questionsHeader)}</span>
                  <span className="tabular-nums">
                    {questionIndex + 1} of {questions.length}
                  </span>
                </div>
                <div className="relative mt-2 h-1 w-full rounded-full bg-[#e4e4ee]">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full bg-[#7c2ae8] transition-all duration-300"
                    style={{
                      width: `${((questionIndex + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {content.questionsIntro && (
                <p className="mt-4 text-[12px] text-[#5f5f7a] leading-relaxed">
                  {content.questionsIntro}
                </p>
              )}

              <h3
                id="onboard-question-title"
                className="mt-3 text-[16px] font-medium text-[#171730]"
              >
                {currentQ.question}
                {!currentQ.required && (
                  <span className="ml-1.5 text-[12px] font-normal text-[#8e8ea6]">— optional</span>
                )}
              </h3>

              <div className="mt-3">
                <LabelInput
                  key={currentQ.id}
                  id={currentQ.id}
                  label={currentQ.required ? 'Your answer' : 'Your answer (optional)'}
                  multiline
                  height={112}
                  corner={12}
                  autoFocus={!isCompleted}
                  disabled={isCompleted}
                  maxLength={currentQ.maxLength}
                  placeholder={currentQ.placeholder}
                  value={currentAnswer}
                  onChange={(v) => {
                    if (modalError) setModalError(null);
                    setProgress({
                      ...progress,
                      answers: { ...progress.answers, [currentQ.id]: v },
                    });
                  }}
                />
                <div className="mt-1 flex items-start justify-between gap-3 text-[11px] text-[#8e8ea6]">
                  <span>{currentQ.hint}</span>
                  <span className="shrink-0">Max {currentQ.maxLength} characters</span>
                </div>
              </div>

              {modalError && (
                <p role="alert" className="mt-2 text-[12px] font-medium text-red-500">
                  {modalError}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between pt-3 border-t border-[#f0f0f5]">
                <button
                  type="button"
                  disabled={questionIndex === 0 || isBusy}
                  onClick={() => {
                    setModalError(null);
                    setQuestionIndex(questionIndex - 1);
                  }}
                  className="text-[12.5px] font-medium text-[#7c2ae8] link-cta cursor-pointer disabled:opacity-50"
                >
                  <Arrow dir="left" /> Back
                </button>
                {isCompleted ? (
                  <Button
                    size="md"
                    showIcon={!isLast}
                    onClick={() => (isLast ? closeQuestions() : setQuestionIndex(questionIndex + 1))}
                  >
                    {isLast ? 'Done' : 'Next'}
                  </Button>
                ) : (
                <Button
                  size="md"
                  showIcon={!isLast}
                  disabled={currentQ.required && !currentAnswer.trim()}
                  loading={isBusy}
                  loadingLabel={isLast ? 'Submitting…' : 'Saving…'}
                  onClick={async () => {
                    if (isLast) {
                      await submit();
                    } else {
                      await save({});
                      setModalError(null);
                      setQuestionIndex(questionIndex + 1);
                    }
                  }}
                >
                  {isLast ? 'Submit' : 'Next'}
                </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Completion Modal */}
        {done && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="onboard-done-title"
              className="relative w-full rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-[#ececf2] max-w-md text-center"
            >
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]">
                <Check className="size-7" />
              </span>
              <h3 id="onboard-done-title" className="mt-4 text-[20px] font-medium text-[#171730]">
                {content.completion.title || 'Done'}
              </h3>
              {content.completion.message && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#5f5f7a] max-w-xs mx-auto">
                  {content.completion.message}
                </p>
              )}
              <div className="mt-6">
                <Button onClick={() => router.push('/dashboard')}>Back to dashboard</Button>
              </div>
              {content.completion.nextStepNote && (
                <p className="mt-3.5 text-[11px] text-[#8e8ea6]">
                  🔒 {content.completion.nextStepNote}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
