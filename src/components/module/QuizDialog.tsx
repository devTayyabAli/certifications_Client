'use client';
// Weekly quiz dialog (Figma redesign). Each answer locks when picked; the last answer returns the result.
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { quizApi, type ModuleItem, type QuizData, type QuizHint, type QuizAttemptResult, type QuizAnswerResponse } from '@/lib/api';
import { dayTime, sessionWhen } from '@/lib/format';
import { Arrow } from '@/components/ui/Arrow';
import { Check } from '@/components/ui/Check';

export function HintButton({ hint, onRewatch }: { hint: QuizHint; onRewatch?: (h: QuizHint) => void }) {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <span className="tabular-nums font-medium text-[#d97706]">{hint.timestamp}</span>
        <span className="text-[#171730]">{hint.title || 'Rewatch this part of the session'}</span>
      </div>
      {onRewatch && <span className="text-[#d97706] font-medium">›</span>}
    </>
  );
  const cls = 'flex w-full items-center justify-between rounded-lg border border-[#fde68a] bg-white px-3 py-2 text-[11px] font-medium text-[#92400e] shadow-2xs';
  return onRewatch ? <button type="button" onClick={() => onRewatch(hint)} className={`${cls} hover:bg-[#fffdf5] cursor-pointer`}>{inner}</button> : <div className={cls}>{inner}</div>;
}

const shareUrl = (text: string) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;

export function QuizDialog({ module: m, quiz, next, onClose, onFinished, onRewatch }: {
  module: ModuleItem;
  quiz: QuizData;
  next?: ModuleItem | null;
  onClose: () => void;
  onFinished: (r: QuizAttemptResult) => void;
  onRewatch?: (h: QuizHint) => void;
}) {
  const router = useRouter();
  const questions = quiz.questions || [];
  const [answers, setAnswers] = useState<Record<number, QuizAnswerResponse>>(() => {
    const map: Record<number, QuizAnswerResponse> = {};
    (quiz.currentAttempt?.answers ?? []).forEach((a) => {
      map[a.questionNumber] = { ...a, attemptNumber: quiz.currentAttempt?.attemptNumber ?? 1, answeredCount: 0, totalQuestions: questions.length, result: null };
    });
    return map;
  });
  const [index, setIndex] = useState(() => {
    const done = new Set((quiz.currentAttempt?.answers ?? []).map((a) => a.questionNumber));
    const i = questions.findIndex((q) => !done.has(q.questionNumber));
    return i === -1 ? 0 : i;
  });
  const [attempt, setAttempt] = useState(quiz.currentAttempt?.attemptNumber ?? (quiz.attemptsUsed || 0) + 1);
  const [picking, setPicking] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAttemptResult | null>(quiz.lastResult || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !picking) onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose, picking]);

  const q = questions[index];
  const answered = q ? answers[q.questionNumber] : undefined;
  const tag = m.partnerName || m.companyTag;

  const pick = async (key: 'A' | 'B' | 'C' | 'D') => {
    if (!q || answered || picking) return;
    setPicking(key);
    setError(null);
    try {
      const a = await quizApi.answer(m.slug, q.questionNumber, key);
      setAttempt(a.attemptNumber);
      setAnswers((prev) => ({ ...prev, [a.questionNumber]: a }));
      if (a.result) {
        setResult(a.result);
        onFinished(a.result);
      }
    } catch (e: any) {
      setError(e.message || 'We couldn’t save that answer. Please try again.');
      if (e.statusCode === 409) onClose();
    } finally {
      setPicking(null);
    }
  };

  const frame = (labelledBy: string, children: React.ReactNode) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171730]/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="relative w-full max-w-[500px] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-[#ececf2]">{children}</div>
    </div>
  );

  if (!quiz.isOpen) {
    return frame('quiz-closed-title', (
      <div className="text-center">
        <h3 id="quiz-closed-title" className="text-[18px] font-medium text-[#171730]">This quiz isn’t open yet</h3>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[#5f5f7a]">
          It opens after the live session{m.scheduledDate ? ` on ${dayTime(m.scheduledDate)}` : ''}.
        </p>
        <div className="mt-5 flex justify-center"><Button size="md" showIcon={false} onClick={onClose}>Got it</Button></div>
      </div>
    ));
  }

  if (result) {
    const badgeName = result.badgeEarned?.name ?? quiz.badge.name;
    if (result.passed) {
      const nextOpen = !!next && next.sessionState !== 'upcoming';
      const when = next && next.scheduledDate ? sessionWhen(next.scheduledDate, next.endDate || undefined) : null;
      const word = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'][result.totalQuestions] ?? String(result.totalQuestions);
      const primary = result.certificateUnlocked
        ? { label: 'View your certificate', go: () => router.push('/certificate') }
        : nextOpen
          ? { label: 'Start the next session', go: () => router.push(`/module/${next!.slug}`) }
          : { label: 'Back to dashboard', go: () => router.push('/dashboard') };
      return frame('quiz-result-title', (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="mx-auto my-2 size-[96px] object-contain drop-shadow-[0_12px_24px_rgba(124,42,232,0.35)]" src={result.badgeEarned?.image ?? quiz.badge.image} />
          <h3 id="quiz-result-title" className="mt-4 text-[22px] font-medium text-[#171730]">Badge earned</h3>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[#5f5f7a]">
            All {word} correct, the week {m.week} badge is yours. {result.certificateUnlocked
              ? 'That was the last one: your certificate is unlocked and ready to mint on Base.'
              : 'It’s on your dashboard now, and it counts toward your certificate.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1 text-[12px] font-medium text-[#16a34a]"><Check className="size-3.5" />{result.score} of {result.totalQuestions} correct</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eedffe] bg-[#f4effe] px-3 py-1 text-[12px] font-medium text-[#7c2ae8]">
              {result.certificateUnlocked ? <><Check className="size-3.5" />Certificate unlocked</> : 'Counts toward your certificate'}
            </span>
          </div>
          <div className="mt-7 space-y-2.5">
            <Button onClick={primary.go}>{primary.label}</Button>
            <a href={shareUrl(`I just earned the "${badgeName}" badge in the Si Her DeFi cohort 🎉`)} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[#e4d6fb] bg-[#f6f0fe] text-[15px] font-medium text-[#7c2ae8] transition hover:bg-[#efe5fd]">Share on LinkedIn <Arrow dir="up-right" /></a>
          </div>
          {next && when && !result.certificateUnlocked && (
            <p className="mt-5 text-[12.5px] text-[#8e8ea6]">
              Next up · <span className="text-[#45465f]">{next.title}</span> · {nextOpen ? 'open now' : `opens ${when.month} ${when.day}`}
            </p>
          )}
          <button type="button" onClick={onClose} className="link-cta mt-3 text-[12.5px] font-medium text-[#5f5f7a]">Back to module</button>
        </div>
      ));
    }
    return frame('quiz-result-title', (
      <div>
        <h3 id="quiz-result-title" className="text-[19px] font-medium text-[#171730]">{result.score} of {result.totalQuestions} correct</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#5f5f7a]">
          You need {result.passingScore} to earn the badge.{' '}
          {result.attemptsRemaining > 0
            ? `You have ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} left — rewatch these parts first:`
            : `That was your last attempt. Rewatch these parts, then you can start over or skip this quiz (without the week ${m.week} badge) from the module page.`}
        </p>
        <div className="mt-4 space-y-2">
          {result.review.map((r) => (
            <div key={r.questionNumber} className="rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-3 space-y-2">
              <p className="text-[11.5px] font-medium text-[#92400e]">Q{r.questionNumber}. {r.questionText}</p>
              {r.hint && <HintButton hint={r.hint} onRewatch={onRewatch ? (h) => { onClose(); onRewatch(h); } : undefined} />}
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-[#f0f0f5] pt-3.5">
          <button type="button" onClick={onClose} className="text-[12px] font-medium text-[#5f5f7a] hover:text-[#171730] cursor-pointer"><Arrow dir="left" /> Back to module</button>
          {result.attemptsRemaining > 0 && (
            <Button size="md" onClick={() => { setResult(null); setAnswers({}); setIndex(0); setAttempt((a) => a + 1); }}>Try again</Button>
          )}
        </div>
      </div>
    ));
  }

  if (!q) return null;
  return frame('quiz-question-title', (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate rounded-full bg-[#f4effe] px-2.5 py-0.5 text-[11px] font-medium text-[#7c2ae8]">Week {String(m.week).padStart(2, '0')} quiz{tag ? ` · ${tag}` : ''}</span>
        <span className="shrink-0 text-[11px] font-medium text-[#8e8ea6]">Attempt {attempt} of {quiz.maxAttempts}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-1.5">
          {questions.map((x, i) => {
            const a = answers[x.questionNumber];
            return <div key={x.questionNumber} className={`h-1.5 flex-1 rounded-full transition-all ${a ? (a.isCorrect ? 'bg-[#16a34a]' : 'bg-[#ef4444]') : i === index ? 'bg-[#7c2ae8]' : 'bg-[#ececf2]'}`} />;
          })}
        </div>
        <span className="text-[10px] font-medium text-[#8e8ea6] shrink-0 tabular-nums">Question {index + 1} of {questions.length}</span>
      </div>
      <h3 id="quiz-question-title" className="mt-5 text-[15px] sm:text-[15.5px] font-medium text-[#171730] leading-snug">{q.questionText}</h3>
      <div className="mt-4 space-y-2.5" role="radiogroup" aria-labelledby="quiz-question-title">
        {q.options.map((o) => {
          const selected = answered?.selectedOption === o.key || picking === o.key;
          let box = 'border border-[#ececf2] bg-white hover:border-[#7c2ae8] hover:bg-[#faf8ff]';
          let dot = 'border border-[#d8d8e5] text-[#5f5f7a] bg-white';
          let glyph: React.ReactNode = o.key;
          if (answered && selected) {
            box = answered.isCorrect ? 'border-2 border-[#16a34a] bg-[#f0fdf4]' : 'border-2 border-[#ef4444] bg-[#fef2f2]';
            dot = answered.isCorrect ? 'bg-[#16a34a] text-white' : 'bg-[#ef4444] text-white';
            glyph = answered.isCorrect ? <Check className="size-3" strokeWidth={2.6} /> : '✕';
          } else if (answered) box = 'border border-[#ececf2] bg-white opacity-60';
          else if (selected) box = 'border-2 border-[#7c2ae8] bg-[#faf8ff]';
          return (
            <button key={o.key} type="button" role="radio" aria-checked={selected} disabled={!!answered || !!picking} onClick={() => pick(o.key as 'A' | 'B' | 'C' | 'D')} className={`w-full rounded-xl p-3 flex items-center justify-between gap-3 text-left transition-all cursor-pointer disabled:cursor-default ${box}`}>
              <div className="flex items-center gap-3">
                <span className={`grid size-6 place-items-center rounded-full text-[11px] font-medium shrink-0 ${dot}`}>{glyph}</span>
                <span className="text-[12px] font-medium text-[#171730]">{o.text}</span>
              </div>
              {answered && selected && (
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium ${answered.isCorrect ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>{answered.isCorrect ? 'Correct' : 'Not quite'}</span>
              )}
            </button>
          );
        })}
      </div>
      {answered?.isCorrect && answered.explanation && (
        <div className="mt-4 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3.5 text-[11.5px] leading-relaxed text-[#166534] flex items-start gap-2.5">
          <span className="mt-0.5 text-[#16a34a]"><Check className="size-4" /></span><span>{answered.explanation}</span>
        </div>
      )}
      {answered && !answered.isCorrect && (
        <div className="mt-4 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-3.5 text-[11.5px] text-[#92400e] space-y-2">
          <p className="leading-snug">⚡ Your answer is locked for this attempt. Worth another look at the session before your next try:</p>
          {answered.hint && <HintButton hint={answered.hint} onRewatch={onRewatch ? (h) => { onClose(); onRewatch(h); } : undefined} />}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-[12px] text-red-500">{error}</p>}
      <div className="mt-5 flex items-center justify-between border-t border-[#f0f0f5] pt-3.5">
        <button type="button" onClick={onClose} disabled={!!picking} className="text-[11.5px] font-medium text-[#5f5f7a] hover:text-[#171730] cursor-pointer disabled:opacity-50"><Arrow dir="left" /> Close</button>
        <span className="text-[10.5px] text-[#8e8ea6]">{answered ? 'Answer locked' : 'Choose an answer — it locks once picked'}</span>
        <Button size="md" disabled={!answered} onClick={() => setIndex((i) => Math.min(i + 1, questions.length - 1))}>Next question</Button>
      </div>
    </>
  ));
}
