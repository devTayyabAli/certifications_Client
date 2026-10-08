"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import DashboardSidebar from "@/components/dashboard-sidebar";
import SessionVideo, { isHostedVideo } from "@/components/session-video";
import {
  ApiErrorResponse,
  onboardApi,
  type OnboardContent,
  type OnboardProgress,
  type OnboardSocial,
} from "@/lib/api";
import { assetPath } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minutesLabel(minutes: number | null) {
  if (!minutes) return null;
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Intro video
// ---------------------------------------------------------------------------

function IntroVideo({
  video,
  watched,
  onWatched,
}: {
  video: OnboardContent["video"];
  watched: boolean;
  onWatched: () => void;
}) {
  const poster = video.posterUrl ? assetPath(video.posterUrl) : undefined;

  if (!video.url) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#0e0c18] text-white shadow-md">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 px-6 text-center">
          <span className="text-[11px] font-mono tracking-wider text-white/80 uppercase">
            {video.caption}
          </span>
          <p className="text-[13px] text-white/90">The intro video will appear here soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SessionVideo
        url={video.url}
        posterUrl={poster}
        caption={video.caption}
        lengthLabel={video.minutes ? `${video.minutes} MIN INTRO` : "INTRO"}
        onWatched={onWatched}
      />
      {/* Hosted embeds can't report progress, so let the learner confirm */}
      {isHostedVideo(video.url) && !watched && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onWatched}
            className="text-[11.5px] font-semibold text-[#7c2ae8] hover:underline cursor-pointer"
          >
            I’ve watched it ✓
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Socials
// ---------------------------------------------------------------------------

function SocialIcon({ platform }: { platform: string }) {
  const base = "grid size-8 shrink-0 place-items-center rounded-lg text-white font-bold text-xs";
  switch (platform) {
    case "x":
    case "twitter":
      return <span className={`${base} bg-black`}>𝕏</span>;
    case "linkedin":
      return <span className={`${base} bg-[#0077b5]`}>in</span>;
    case "instagram":
      return <span className={`${base} bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]`}>IG</span>;
    case "telegram":
      return <span className={`${base} bg-[#229ed9]`}>TG</span>;
    case "youtube":
      return <span className={`${base} bg-[#ff0000]`}>▶</span>;
    default:
      return <span className={`${base} bg-[#7c2ae8]`}>↗</span>;
  }
}

function SocialCard({
  social,
  followed,
  onFollow,
}: {
  social: OnboardSocial;
  followed: boolean;
  onFollow: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#ececf2] bg-white p-3.5 shadow-xs">
      <div className="flex min-w-0 items-center gap-3">
        <SocialIcon platform={social.platform} />
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-bold text-[#171730]">{social.label}</p>
          {social.handle && <p className="truncate text-[11px] text-[#8e8ea6]">{social.handle}</p>}
        </div>
      </div>
      <a
        href={social.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onFollow}
        className={`shrink-0 rounded-full border px-3.5 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
          followed
            ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]"
            : "border-[#e2e2ec] text-[#171730] hover:bg-gray-50 hover:border-[#7c2ae8]"
        }`}
      >
        {followed ? "Followed ✓" : "Follow ↗"}
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task rail
// ---------------------------------------------------------------------------

type TaskState = "done" | "current" | "pending";

function TaskStep({
  index,
  state,
  title,
  detail,
}: {
  index: number;
  state: TaskState;
  title: string;
  detail: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold mt-0.5 ${
          state === "done"
            ? "bg-[#16a34a] text-white"
            : state === "current"
              ? "bg-[#7c2ae8] text-white"
              : "border border-[#dcdce8] text-[#8e8ea6]"
        }`}
      >
        {state === "done" ? "✓" : index}
      </span>
      <div>
        <p className="text-[13px] font-bold text-[#171730]">{title}</p>
        {detail && <p className="text-[11px] text-[#8e8ea6]">{detail}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

function Modal({
  labelledBy,
  onClose,
  children,
  className = "max-w-lg",
}: {
  labelledBy: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative w-full rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-[#ececf2] animate-in fade-in zoom-in-95 duration-200 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; content: OnboardContent };

export default function OnboardView() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [progressStatus, setProgressStatus] = useState<OnboardProgress["status"]>("not_started");
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [videoWatched, setVideoWatched] = useState(false);

  const [modal, setModal] = useState<"none" | "questions" | "done">("none");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Load the CMS content and this learner's saved progress
  useEffect(() => {
    let cancelled = false;
    onboardApi
      .getPart1()
      .then(({ content, progress }) => {
        if (cancelled) return;
        setLoad({ status: "ready", content });
        setProgressStatus(progress.status);
        setCompletedAt(progress.completedAt);
        setAnswers(progress.answers);
        setFollowedIds(progress.followedSocialIds);
        setVideoWatched(progress.videoWatched);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoad({
          status: "error",
          message:
            err instanceof Error && err.message
              ? err.message
              : "We couldn’t load onboarding right now. Please try again.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const closeQuestions = useCallback(() => {
    setModal("none");
    setModalError(null);
  }, []);

  if (load.status !== "ready") {
    return (
      <PageFrame collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)}>
        {load.status === "loading" ? (
          <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading onboarding">
            <div className="h-5 w-40 rounded bg-[#ececf2]" />
            <div className="h-8 w-2/3 rounded bg-[#ececf2]" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="aspect-video rounded-2xl bg-[#ececf2] lg:col-span-8" />
              <div className="h-80 rounded-2xl bg-[#ececf2] lg:col-span-4" />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#ececf2] bg-white p-8 text-center shadow-xs">
            <p className="text-[14px] font-semibold text-[#171730]">{load.message}</p>
            <button
              type="button"
              onClick={() => {
                setLoad({ status: "loading" });
                setReloadKey((k) => k + 1);
              }}
              className="mt-4 rounded-full bg-[#171730] px-5 py-2 text-[12.5px] font-bold text-white hover:bg-black cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}
      </PageFrame>
    );
  }

  const { content } = load;
  const { questions, socials } = content;
  const isCompleted = progressStatus === "completed";
  const followed = new Set(followedIds);
  const requiredSocials = socials.filter((s) => s.required);
  const socialsDone = requiredSocials.every((s) => followed.has(s.id));
  const answeredCount = questions.filter((q) => (answers[q.id] ?? "").trim()).length;
  const hasDraftAnswers = answeredCount > 0;

  const answerPayload = () =>
    questions.map((q) => ({ questionId: q.id, answerText: answers[q.id] ?? "" }));

  // ── Actions ──────────────────────────────────────────────────────────────

  const markVideoWatched = () => {
    if (videoWatched || isCompleted) return;
    setVideoWatched(true);
    onboardApi.saveDraft({ videoWatched: true }).catch(() => {
      // Not critical — it is sent again with the final submission
    });
  };

  const markFollowed = (social: OnboardSocial) => {
    if (followed.has(social.id) || isCompleted) return;
    setFollowedIds((ids) => [...ids, social.id]);
    onboardApi.saveDraft({ followedSocialIds: [social.id] }).catch(() => {
      // Not critical — every follow is sent again with the final submission
    });
  };

  const openQuestions = () => {
    if (!socialsDone || isCompleted) return;
    // Resume at the first unanswered question
    const firstOpen = questions.findIndex((q) => !(answers[q.id] ?? "").trim());
    setQuestionIndex(firstOpen === -1 ? 0 : firstOpen);
    setModalError(null);
    setModal("questions");
  };

  const saveAndExit = async () => {
    setIsBusy(true);
    setModalError(null);
    try {
      await onboardApi.saveDraft({ answers: answerPayload() });
      setProgressStatus("draft");
      setModal("none");
      setToast("Progress saved — pick up where you left off any time.");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Couldn’t save your answers. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const submit = async () => {
    setIsBusy(true);
    setModalError(null);
    try {
      const result = await onboardApi.submitPart1({
        answers: answerPayload(),
        followedSocialIds: followedIds,
        videoWatched,
      });
      setProgressStatus("completed");
      setCompletedAt(result.completedAt);
      setModal("done");
    } catch (err) {
      // Point the learner at the first question the server rejected
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
            (err instanceof Error ? err.message : "Couldn’t submit your answers. Please try again.")
        );
      }
    } finally {
      setIsBusy(false);
    }
  };

  // ── Task rail state ──────────────────────────────────────────────────────

  const videoState: TaskState = videoWatched || isCompleted ? "done" : "current";
  const socialsState: TaskState = socialsDone || isCompleted ? "done" : videoWatched ? "current" : "pending";
  const questionsState: TaskState = isCompleted ? "done" : socialsDone ? "current" : "pending";

  const videoDetail = [
    minutesLabel(content.video.minutes),
    videoWatched || isCompleted ? "watched" : content.video.url ? "start here" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const socialsDetail =
    requiredSocials.length === 0
      ? "Optional"
      : `${requiredSocials.filter((s) => followed.has(s.id)).length} of ${requiredSocials.length} followed · ${
          requiredSocials.length === 2 ? "Both required" : "All required"
        }`;

  const questionsDetail = isCompleted
    ? "Submitted"
    : hasDraftAnswers
      ? `${answeredCount} of ${questions.length} answered`
      : content.questionsMinutes
        ? `About ${minutesLabel(content.questionsMinutes)}`
        : `${questions.length} question${questions.length === 1 ? "" : "s"}`;

  // ── Question modal state ─────────────────────────────────────────────────

  const currentQuestion = questions[questionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] ?? "" : "";
  const isLastQuestion = questionIndex >= questions.length - 1;
  const currentBlocked = !!currentQuestion?.required && !currentAnswer.trim();

  return (
    <PageFrame collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)}>
      {toast && (
        <div
          role="status"
          className="fixed top-5 right-5 z-60 rounded-xl bg-[#171730] px-4 py-2.5 text-[12.5px] font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-3"
        >
          {toast}
        </div>
      )}

      {/* Heading */}
      <div>
        {content.stepLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0eafb] px-3 py-1 text-[10px] font-bold tracking-wider text-[#7c2ae8] uppercase">
            ● {content.stepLabel}
          </span>
        )}
        <h1 className="mt-2 text-[24px] sm:text-[26px] font-bold tracking-tight text-[#171730]">
          {content.page.title}
        </h1>
        {content.page.subtitle && (
          <p className="mt-1 text-[13px] leading-relaxed text-[#5f5f7a]">{content.page.subtitle}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: video + socials */}
        <div className="space-y-6 lg:col-span-8">
          <IntroVideo video={content.video} watched={videoWatched} onWatched={markVideoWatched} />

          {socials.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[13.5px] font-bold text-[#171730]">
                  {content.socialsHeading || "Follow us"}
                </h2>
                {requiredSocials.length > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                      socialsDone ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#fef3c7] text-[#b45309]"
                    }`}
                  >
                    {socialsDone ? "DONE" : "REQUIRED"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {socials.map((social) => (
                  <SocialCard
                    key={social.id}
                    social={social}
                    followed={followed.has(social.id) || isCompleted}
                    onFollow={() => markFollowed(social)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: task rail */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-[#ececf2] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-[11px] font-bold tracking-wider text-[#8e8ea6] uppercase">YOUR TASK</h3>

            <div className="space-y-4">
              <TaskStep
                index={1}
                state={videoState}
                title={content.tasks.video || "Watch the intro"}
                detail={videoDetail || null}
              />
              {socials.length > 0 && (
                <TaskStep
                  index={2}
                  state={socialsState}
                  title={content.tasks.socials || content.socialsHeading || "Follow us"}
                  detail={socialsDetail}
                />
              )}
              <TaskStep
                index={socials.length > 0 ? 3 : 2}
                state={questionsState}
                title={content.tasks.questions || "Answer a short set of questions"}
                detail={questionsDetail}
              />
            </div>

            {content.taskNote && (
              <div className="rounded-xl bg-[#f0eafb] p-3 text-[#5b21b6] text-[11.5px] leading-relaxed flex items-start gap-2">
                <span className="text-[#7c2ae8] font-bold" aria-hidden="true">
                  ℹ
                </span>
                <span>{content.taskNote}</span>
              </div>
            )}

            {isCompleted ? (
              <>
                <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-[12px] text-[#166534]">
                  ✓ {content.completion.title || "Completed"}
                  {completedAt ? ` · ${formatDate(completedAt)}` : ""}
                </div>
                <Link
                  href="/dashboard"
                  className="block w-full rounded-xl bg-gradient-to-r from-[#501c9c] via-[#6d25d6] to-[#983cf4] py-3 text-center text-[13.5px] font-semibold text-white shadow-md shadow-purple-950/20 transition hover:brightness-105"
                >
                  Back to dashboard →
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openQuestions}
                  disabled={!socialsDone || isBusy || questions.length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-[#501c9c] via-[#6d25d6] to-[#983cf4] py-3 text-[13.5px] font-semibold text-white shadow-md shadow-purple-950/20 transition hover:brightness-105 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {hasDraftAnswers ? "Resume questions →" : "Continue to questions →"}
                </button>
                {!socialsDone && (
                  <p className="text-center text-[11px] text-[#b45309]">
                    Follow the required accounts above to continue.
                  </p>
                )}
                {modal === "none" && modalError && (
                  <p role="alert" className="text-center text-[11.5px] text-red-500">
                    {modalError}
                  </p>
                )}
                <p className="text-center text-[9.5px] font-bold tracking-wider text-[#8e8ea6] uppercase">
                  REQUIRED BEFORE THE MODULES OPEN
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Questions */}
      {modal === "questions" && currentQuestion && (
        <Modal labelledBy="onboard-question-title" onClose={isBusy ? undefined : closeQuestions}>
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-[#8e8ea6] uppercase">
              <span>{content.questionsHeader}</span>
              <span>
                {questionIndex + 1} of {questions.length}
              </span>
            </div>
            <div className="relative mt-2 h-1 w-full rounded-full bg-[#e4e4ee]">
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-[#7c2ae8] transition-all duration-300"
                style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {content.questionsIntro && (
            <p className="mt-4 text-[12px] text-[#5f5f7a] leading-relaxed">{content.questionsIntro}</p>
          )}

          <h3 id="onboard-question-title" className="mt-3 text-[16px] font-bold text-[#171730]">
            {currentQuestion.question}
            {!currentQuestion.required && (
              <span className="ml-1.5 text-[12px] font-normal text-[#8e8ea6]">— optional</span>
            )}
          </h3>

          <div className="mt-3">
            <textarea
              key={currentQuestion.id}
              autoFocus
              rows={4}
              maxLength={currentQuestion.maxLength}
              value={currentAnswer}
              onChange={(e) => {
                const value = e.target.value;
                if (modalError) setModalError(null);
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
              }}
              placeholder={currentQuestion.placeholder}
              aria-label={currentQuestion.question}
              className="w-full rounded-xl border border-[#7c2ae8] p-3.5 text-[13px] text-[#171730] outline-none ring-1 ring-[#7c2ae8] transition placeholder:text-[#9ca3af] resize-none"
            />
            <div className="mt-1 flex items-start justify-between gap-3 text-[11px] text-[#8e8ea6]">
              <span>{currentQuestion.hint}</span>
              <span className="shrink-0 font-mono">
                {currentAnswer.length} / {currentQuestion.maxLength}
              </span>
            </div>
          </div>

          {modalError && (
            <p role="alert" className="mt-3 text-[12px] font-medium text-red-500">
              {modalError}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between pt-3 border-t border-[#f0f0f5]">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => (questionIndex > 0 ? setQuestionIndex(questionIndex - 1) : closeQuestions())}
              className="text-[12.5px] font-semibold text-[#7c2ae8] hover:underline cursor-pointer disabled:opacity-50"
            >
              ← Back
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={saveAndExit}
              className="text-[12px] text-[#8e8ea6] hover:text-[#171730] cursor-pointer disabled:opacity-50"
            >
              Save &amp; exit
            </button>

            <button
              type="button"
              disabled={currentBlocked || isBusy}
              onClick={() => {
                setModalError(null);
                if (isLastQuestion) submit();
                else setQuestionIndex(questionIndex + 1);
              }}
              className="rounded-full bg-[#171730] px-5 py-2 text-[12.5px] font-bold text-white transition hover:bg-black cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isBusy && isLastQuestion ? "Submitting…" : isLastQuestion ? "Submit" : "Next"}
            </button>
          </div>
        </Modal>
      )}

      {/* Completion */}
      {modal === "done" && (
        <Modal labelledBy="onboard-done-title" className="max-w-md text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]">
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <h3 id="onboard-done-title" className="mt-4 text-[20px] font-bold text-[#171730]">
            {content.completion.title || "Done"}
          </h3>
          {content.completion.message && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#5f5f7a] max-w-xs mx-auto">
              {content.completion.message}
            </p>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#501c9c] via-[#6d25d6] to-[#983cf4] py-3 text-[14px] font-semibold text-white shadow-md shadow-purple-950/20 transition hover:brightness-105 cursor-pointer"
          >
            Back to dashboard
          </button>
          {content.completion.nextStepNote && (
            <p className="mt-3.5 text-[11px] text-[#8e8ea6]">🔒 {content.completion.nextStepNote}</p>
          )}
        </Modal>
      )}
    </PageFrame>
  );
}

function PageFrame({
  collapsed,
  onToggle,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8f8fc] font-sans antialiased text-[#171730]">
      <DashboardSidebar collapsed={collapsed} onToggle={onToggle} />
      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 sm:py-8 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#7c2ae8] transition-colors hover:underline"
          >
            ← Back to dashboard
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
