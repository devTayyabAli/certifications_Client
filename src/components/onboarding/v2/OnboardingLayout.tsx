'use client';
// Redesigned onboarding layout (Figma "Post-UX-Fixes" → "Email sign up" → "01 · Sign up — default", node 1023:234)
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { assetPath } from '@/lib/constants';

export function BrandNav({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-[72px] w-full shrink-0 items-center justify-between gap-3 border-b border-[#e7e7f1] bg-white px-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link href="/login" aria-label="Si Her DeFi" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetPath('/v2/logo-si-her-defi.svg')} alt="Si Her DeFi" width={108} height={27} className="block h-[27px] w-[108px]" />
        </Link>
        <span className="inline-flex h-7 sm:h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#e7e7f1] bg-[#f5f5fc] px-3 sm:px-3.5">
          <span className="text-[9px] font-medium text-[#8688ae]">Powered by</span>
          <span className="inline-flex items-center gap-1">
            <span className="size-[11px] rounded-full bg-[#0052ff]" />
            <span className="text-[11px] font-medium text-[#0052ff]">BASE</span>
          </span>
        </span>
      </div>
      {right}
    </header>
  );
}

const STEPS = ['Verify your email', 'Create your profile', 'Connect a wallet'];

/** step: 0 = email, 1 = profile, 2 = wallet. Dots sit on one track; labels align left / centre / right. */
export function StepProgress({ step }: { step: 0 | 1 | 2 }) {
  const fill = step === 0 ? '0%' : step === 1 ? '50%' : '100%';
  return (
    <div className="relative w-full" role="list" aria-label={`Step ${step + 1} of 3`}>
      <div className="relative h-[14px] mx-[10px]">
        <div className="absolute inset-x-0 top-[6px] h-[2px] rounded-[1px] bg-[#e7e7f1]" />
        <div className="absolute left-0 top-[6px] h-[2px] rounded-[1px] bg-[#7b2fbe] transition-[width] duration-300" style={{ width: fill }} />
        {STEPS.map((_, i) => {
          const left = i === 0 ? '0%' : i === 1 ? '50%' : '100%';
          const current = i === step;
          const done = i < step;
          return (
            <span key={i} className="absolute top-[7px] -translate-x-1/2 -translate-y-1/2" style={{ left }} aria-hidden="true">
              {current ? (
                <span className="relative grid size-6 place-items-center rounded-full bg-[#f3e8fc]">
                  <span className="grid size-[14px] place-items-center rounded-full bg-[#7b2fbe]">
                    <span className="size-[5px] rounded-full bg-white" />
                  </span>
                </span>
              ) : (
                <span className={`block size-[10px] rounded-full ${done ? 'bg-[#7b2fbe]' : 'bg-[#e7e7f1]'}`} />
              )}
            </span>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            role="listitem"
            aria-current={i === step ? 'step' : undefined}
            className={`text-[11px] sm:text-[12px] leading-4 ${i === 0 ? 'text-left' : i === 1 ? 'text-center' : 'text-right'} ${i === step ? 'font-medium text-[#151534]' : i < step ? 'text-[#4c4d77]' : 'text-[#8688ae]'}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const PROPS: { icon: 'award' | 'certificate' | 'si3'; title: string; body: ReactNode }[] = [
  { icon: 'award', title: 'A badge for every module you pass', body: "Earned by quiz, carrying the educator's mark." },
  { icon: 'certificate', title: 'An on-chain certificate on Base', body: 'Verifiable, and addable to LinkedIn.' },
  { icon: 'si3', title: 'Opportunities to stay engaged.', body: (<>Within <a href="https://si3.space/" target="_blank" rel="noopener noreferrer" className="underline decoration-from-font underline-offset-2">{"SI<3>'s Ecosystem"}</a>.</>) },
];

export function ArtRail() {
  return (
    <aside className="relative flex min-h-[460px] flex-col justify-between gap-16 overflow-hidden bg-[#0d0f18] px-6 py-8 sm:px-10 sm:py-[43px] lg:sticky lg:top-[72px] lg:h-[calc(100dvh-72px)] lg:w-[34.375%] lg:min-w-[380px] lg:max-w-[560px] lg:shrink-0">
      <Image alt="" fill priority sizes="(min-width: 1024px) 35vw, 100vw" className="object-cover object-center" src={assetPath('/logIn.png')} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/60 lg:hidden" />
      <div className="relative z-10 flex flex-col gap-1 text-white">
        <h2 className="text-[20px] font-medium leading-[35px] tracking-[-0.4px]">DeFi, taught by the people leading it.</h2>
        <p className="max-w-[420px] text-[14px] leading-[22px]">Twelve partner-led modules, one live session a week, and an on-certificate demonstrating your DeFi credentials.</p>
      </div>
      <ul className="relative z-10 flex flex-col gap-[14px]">
        {PROPS.map((p) => (
          <li key={p.title} className="flex items-start gap-[14px] text-white">
            {p.icon === 'si3' ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={assetPath('/v2/icon-si3.svg')} alt="" width={36} height={36} className="size-9 shrink-0" />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#dcc2f2] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetPath(`/v2/icon-${p.icon}.svg`)} alt="" width={18} height={18} className="size-[18px]" />
              </span>
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14px] leading-5">{p.title}</span>
              <span className="text-[12.5px] leading-[17px]">{p.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function OnboardingLayout({ step, navRight, children }: { step: 0 | 1 | 2; navRight?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f4f5fc] font-sans text-[#151534] antialiased">
      <BrandNav right={navRight} />
      <div className="flex flex-1 flex-col lg:flex-row">
        <main className="flex min-h-[calc(100dvh-64px)] min-w-0 flex-1 items-center justify-center px-4 py-6 sm:min-h-[calc(100dvh-72px)] sm:px-10 sm:py-12">
          <div className="flex w-full max-w-[420px] flex-col gap-6 sm:gap-8">
            <StepProgress step={step} />
            {children}
          </div>
        </main>
        <ArtRail />
      </div>
    </div>
  );
}

export const cardV2 = 'flex w-full flex-col gap-[26px] rounded-[16px] sm:rounded-[20px] border border-[#e7e7f1] bg-white px-5 pb-6 pt-7 sm:px-9 sm:pb-8 sm:pt-9';
