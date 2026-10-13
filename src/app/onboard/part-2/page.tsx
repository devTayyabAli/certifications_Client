'use client';
// Onboarding Part 2 — a short close-out reflection. Opens once every session and its quiz are done;
// finishing it completes onboarding (2 of 2) and points to minting the certificate.
// The questions come from the CMS (written by the SI<3> team): any number, no character limit.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/onboarding-shell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LabelInput } from '@/components/ui/LabelInput';
import { Arrow } from '@/components/ui/Arrow';
import { Check } from '@/components/ui/Check';
import { assetPath } from '@/lib/constants';
import { badgeApi, certificateApi, modulesApi, onboardApi } from '@/lib/api';
import { firstName } from '@/lib/format';
import type { Badges, Certificate, Part2 } from '@/lib/types';
import { CertificateArt } from '@/components/certificate/CertificateArt';
import { Confetti } from '@/components/ui/Confetti';
import { useProfile } from '@/components/profile-provider';

/** The Si Her DeFi crystal on the brand gradient (same as the favicon) */
const Crystal = ({ className = 'size-12' }: { className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={assetPath('/icon.svg')} alt="" className={`${className} rounded-2xl shadow-[0_10px_24px_rgba(94,50,149,0.35)]`} />
);

export default function Part2Page() {
  const { profile } = useProfile();
  const [data, setData] = useState<Part2 | null>(null);
  const [badges, setBadges] = useState<Badges | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [celebrateNow, setCelebrateNow] = useState(false);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [titles, setTitles] = useState<Record<number, string>>({});

  useEffect(() => {
    onboardApi.getPart2().then((d: Part2) => { setData(d); setAnswers(d.progress.answers); setDone(!!d.progress.completedAt); }).catch(() => {});
    badgeApi.getBadges().then((b: any) => setBadges(b)).catch(() => {});
    certificateApi.getCertificate().then((c: any) => setCert(c)).catch(() => {});
    modulesApi.getAll().then((ms: any[]) => setTitles(Object.fromEntries(ms.map((m) => [m.week, m.title])))).catch(() => {});
  }, []);

  if (!data) return <div className="grid min-h-[60vh] place-items-center text-[#7c2ae8]"><Spinner className="size-6" /></div>;

  const back = <Link className="link-cta text-[12px] font-medium text-[#7c2ae8]" href="/dashboard"><Arrow dir="left" /> Back to dashboard</Link>;
  const name = profile?.name ? firstName(profile.name) : '';

  if (!data.unlocked) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {back}
        <div className="rounded-2xl border border-[#ececf2] bg-white p-6 space-y-3">
          <span className="text-[12px] text-[#a894c8]">Part 2 · Locked</span>
          <h1 className="text-[22px] font-medium tracking-tight text-[#171730]">{data.title}</h1>
          <p className="text-[13px] leading-6 text-[#5f5f7a]">It opens once you’ve finished every session and its quiz.</p>
        </div>
      </div>
    );
  }

  if (done) {
    // the moment after Part 2: celebrate, show the certificate they've earned, and lead straight to minting
    return (
      <div className="mx-auto max-w-[1060px] space-y-6">
        {back}
        {celebrateNow && <Confetti pieces={70} />}
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]"><Check className="size-7" /></span>
          <div>
            <h1 className="text-[28px] font-medium leading-tight tracking-tight text-[#171730] sm:text-[32px]">You did it{name ? `, ${name}` : ''}.</h1>
            <p className="mt-1 text-[14px] leading-6 text-[#5f5f7a]">Onboarding is complete and every badge is in. Your certificate is ready to mint on Base.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {cert ? <CertificateArt cert={cert} preview={false} weekTitles={titles} /> : <div className="aspect-square rounded-2xl bg-white" />}
          </div>
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border border-[#ececf2] bg-white p-6 space-y-4">
              <p className="text-[12.5px] font-medium text-[#16a34a]">Onboarding · 2 of 2 complete</p>
              <h2 className="text-[20px] font-medium tracking-tight text-[#171730]">Mint your certificate</h2>
              <p className="text-[13px] leading-6 text-[#5f5f7a]">It becomes a soulbound token in your wallet: permanent, verifiable, and gas is covered by Si Her DAO.</p>
              <div className="divide-y divide-[#f0f0f5] rounded-xl border border-[#ececf2] px-4 text-[13px]">
                <div className="flex justify-between py-2.5"><span className="text-[#8e8ea6]">Badges</span><span className="font-medium text-[#171730]">{badges ? `${badges.earnedCount} of ${badges.totalCohortBadges}` : '—'}</span></div>
                <div className="flex justify-between py-2.5"><span className="text-[#8e8ea6]">Network</span><span className="inline-flex items-center gap-1.5 font-medium text-[#171730]"><span className="size-2 rounded-full bg-[#0052ff]" />Base</span></div>
              </div>
              <ButtonLink href="/certificate?mint=1">Mint your certificate</ButtonLink>
              <div className="text-center"><Link href="/dashboard" className="link-cta text-[12.5px] font-medium text-[#5f5f7a]">Back to dashboard</Link></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const answered = data.questions.filter((q) => answers[q.id]?.trim()).length;
  const submit = async () => {
    const empty = data.questions.filter((q) => q.required && !answers[q.id]?.trim()).map((q) => q.id);
    setMissing(empty);
    if (empty.length) { document.getElementById(empty[0])?.focus(); return; }
    setBusy(true);
    try {
      await onboardApi.submitPart2(answers);
      setDone(true);
      setCelebrateNow(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {back}

      {/* welcome: a moment to celebrate before the questions */}
      <section className="relative rounded-3xl border border-[#ececf2] bg-white p-6 sm:p-8">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <Crystal className="size-14 shrink-0" />
          <div className="min-w-0 space-y-2">
            <p className="text-[12.5px] text-[#7c2ae8]">Part 2 of 2 · {data.title}</p>
            <h1 className="text-[26px] font-medium leading-tight tracking-tight text-[#171730] sm:text-[30px]">You made it{name ? `, ${name}` : ''}</h1>
            <p className="max-w-xl text-[13.5px] leading-6 text-[#5f5f7a]">{data.subtitle}</p>
          </div>
        </div>
        {badges && badges.badges.length > 0 && (
          <div className="relative mt-6 flex flex-wrap items-center gap-3 border-t border-[#f0f0f5] pt-5">
            <div className="flex -space-x-2.5">
              {badges.badges.slice(0, 8).map((b: any) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={b.badgeId || b.id || b.name} src={assetPath(b.image)} alt={b.name} title={b.moduleTitle ?? b.name} className="size-9 object-contain drop-shadow-[0_3px_6px_rgba(94,50,149,0.25)]" />
              ))}
            </div>
            <span className="text-[13px] text-[#45465f]">{badges.earnedCount} badges earned</span>
          </div>
        )}
      </section>

      {/* the questions, one card each, in the order the CMS gives them */}
      <div className="space-y-4">
        {data.questions.map((q) => (
          <section key={q.id} className={`rounded-2xl border bg-white p-5 sm:p-6 ${missing.includes(q.id) ? 'border-red-200' : 'border-[#ececf2]'}`}>
            <div>
              <div className="space-y-3">
                <div>
                  <h2 className="text-[16px] font-medium leading-6 text-[#171730]">{q.question}{!q.required && <span className="ml-1.5 text-[12.5px] font-normal text-[#8e8ea6]">optional</span>}</h2>
                  {q.hint && <p className="mt-1 text-[12.5px] text-[#8e8ea6]">{q.hint}</p>}
                </div>
                <LabelInput
                  id={q.id} name={q.id} label={q.required ? 'Your answer' : 'Your answer (optional)'} multiline height={132} corner={12}
                  placeholder={q.placeholder} value={answers[q.id] ?? ''} disabled={busy}
                  invalid={missing.includes(q.id)} describedBy={missing.includes(q.id) ? `${q.id}-err` : undefined}
                  onChange={(v) => { setAnswers({ ...answers, [q.id]: v }); if (missing.includes(q.id)) setMissing(missing.filter((x) => x !== q.id)); }}
                />
                {missing.includes(q.id) && <p id={`${q.id}-err`} className="text-[12px] text-red-500">Add a short answer to continue.</p>}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[#ececf2] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-[12.5px] leading-5 text-[#8e8ea6]">{answered} of {data.questions.length} answered · only the SI<span>&lt;3&gt;</span> team reads these.</p>
        <Button onClick={submit} loading={busy} loadingLabel="Submitting" className="sm:w-auto sm:px-8">Finish Part 2</Button>
      </div>
    </div>
  );
}
