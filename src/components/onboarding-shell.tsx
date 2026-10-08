import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { assetPath } from "@/lib/constants";

export const ONBOARDING_STEPS = [
  { label: "Email verified", doneLabel: "Email verified" },
  { label: "Create your profile", doneLabel: "Profile created" },
  { label: "Connect a wallet", doneLabel: "Wallet connected" },
] as const;

const STEP_COUNT = ONBOARDING_STEPS.length;

const buttonBaseClasses =
  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14.5px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c2ae8]";

export function primaryButtonClasses(variant: "active" | "muted" = "active") {
  return variant === "muted"
    ? `${buttonBaseClasses} bg-[#ece7fb] text-[#a99ccc] cursor-not-allowed`
    : `${buttonBaseClasses} bg-gradient-to-r from-[#501c9c] via-[#6d25d6] to-[#983cf4] text-white shadow-md shadow-purple-950/20 hover:brightness-105 active:scale-[0.99] cursor-pointer`;
}

export type HighlightItem = {
  icon: ReactNode;
  title: string;
  body: ReactNode;
};

const defaultHighlights: HighlightItem[] = [
  {
    icon: <BadgeIcon />,
    title: "A badge for every module you pass",
    body: "Earned by quiz, carrying the partner's mark.",
  },
  {
    icon: <CertificateIcon />,
    title: "An on-chain certificate on Base",
    body: "Verifiable, and addable to LinkedIn.",
  },
  {
    icon: <OpportunityIcon />,
    title: "Opportunities to stay engaged.",
    body: (
      <>
        Within{" "}
        <span className="underline underline-offset-2 hover:text-white cursor-pointer">
          Si&lt;3&gt;&apos;s Ecosystem.
        </span>
      </>
    ),
  },
];

type OnboardingShellProps = {
  currentStep: number;
  headerAction?: ReactNode;
  rightTitle?: string;
  rightSubtitle?: string;
  highlights?: HighlightItem[];
  compactCard?: boolean;
  children: ReactNode;
};

export default function OnboardingShell({
  currentStep,
  headerAction,
  rightTitle = "DeFi, taught by the people leading it.",
  rightSubtitle = "Twelve partner-led modules, one live session a week, and an on-certificate demonstrating your DeFi credentials.",
  highlights = defaultHighlights,
  compactCard = true,
  children,
}: OnboardingShellProps) {
  // Progress fraction: how far the connector line should extend (0–1)
  const progressFraction =
    STEP_COUNT > 1 ? currentStep / (STEP_COUNT - 1) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans antialiased text-[#171730]">
      {/* Header bar across full width */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#ececf2] bg-white px-6 sm:px-10">
        <div className="flex items-center gap-3.5">
          <Wordmark />
          <span className="hidden items-center gap-1.5 rounded-full border border-[#e4e4ed] bg-[#f9fafc] px-3 py-1 sm:inline-flex">
            <span className="text-[9px] font-semibold tracking-[0.14em] text-[#8e8ea6]">
              POWERED BY
            </span>
            <span className="size-2 rounded-full bg-[#0052ff]" />
            <span className="text-[9.5px] font-bold tracking-[0.14em] text-[#171730]">
              BASE
            </span>
          </span>
        </div>

        <div className="text-[13px]">{headerAction}</div>
      </header>

      {/* Main split: 50% left (form), 50% right (artwork) */}
      <main className="flex flex-1 flex-col lg:flex-row overflow-y-auto">
        {/* Left column: Stepper + Card / Form */}
        <div className="flex flex-2 items-start lg:items-center justify-center bg-[#f7f7fb] px-4 py-6 sm:px-8 lg:py-8 lg:max-h-[calc(100vh-64px)]">
          <div className="w-full max-w-[440px] my-auto">
            {/* ── Stepper ── */}
            <div className="relative mb-8 w-full">
              {/* Grey connector track: spans from centre of step-0 to centre of last step */}
              <div className="absolute top-[10px] left-[32px] sm:left-[40px] right-[32px] sm:right-[40px] h-[2px] bg-[#e4e4ee]" />

              {/* Active purple connector — width driven by currentStep fraction */}
              <div
                className="absolute top-[10px] left-[32px] sm:left-[40px] h-[2px] bg-[#7c2ae8] transition-all duration-300"
                style={{ width: `calc(${progressFraction * 100}% - ${progressFraction * 64}px)` }}
              />

              {/* Step items — rendered from ONBOARDING_STEPS array */}
              <div className="relative flex justify-between">
                {ONBOARDING_STEPS.map((step, index) => {
                  const isDone = currentStep > index;
                  const isActive = currentStep === index;

                  return (
                    <div
                      key={step.label}
                      className="flex w-16 sm:w-20 flex-col items-center"
                    >
                      {/* Dot / checkmark */}
                      <div
                        className={`relative z-10 grid size-5 place-items-center rounded-full ring-4 ring-[#f7f7fb] transition-colors ${isDone
                          ? "bg-[#7c2ae8] text-white shadow-xs"
                          : isActive
                            ? "border-[2.5px] border-[#7c2ae8] bg-white shadow-xs"
                            : "border-[2px] border-[#dcdce8] bg-white"
                          }`}
                      >
                        {isDone ? (
                          <CheckMarkMini />
                        ) : isActive ? (
                          <span className="size-2 rounded-full bg-[#7c2ae8]" />
                        ) : null}
                      </div>

                      {/* Label */}
                      <span
                        className={`mt-2 text-center text-[10px] sm:text-[12px] leading-tight ${isActive
                          ? "font-bold text-[#171730]"
                          : isDone
                            ? "font-normal text-[#6b7280]"
                            : "font-normal text-[#9ca3af]"
                          }`}
                      >
                        {isDone ? step.doneLabel : step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content area: either enclosed card or direct flow */}
            {compactCard ? (
              <section className="rounded-2xl sm:rounded-3xl border border-[#ececf2] bg-white p-5 sm:p-9 shadow-[0_2px_16px_rgba(23,23,48,0.03),0_12px_32px_-12px_rgba(23,23,48,0.06)]">
                {children}
              </section>
            ) : (
              <div className="w-full">{children}</div>
            )}
          </div>
        </div>

        {/* Right column: Edge-to-edge artwork panel */}
        <aside className="relative flex flex-1 flex-col justify-between overflow-hidden bg-[#0d0f18] p-6 sm:p-12 min-h-[440px] lg:min-h-[calc(100vh-64px)] lg:p-16">
          <Image
            src={assetPath("/logIn.png")}
            alt="Si Her DeFi Artwork"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-center"
          />

          {/* Vignette & contrast overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/10 to-black/85 pointer-events-none"
          />

          {/* Top text content */}
          <div className="relative z-10 max-w-lg">
            <h2 className="text-[20px] font-semibold tracking-tight text-white leading-snug">
              {rightTitle}
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[#FFFFFF] max-w-md">
              {rightSubtitle}
            </p>
          </div>

          {/* Bottom highlights (open, floating directly over the landscape) */}
          <div className="relative z-10 mt-12 sm:mt-16">
            <div className="space-y-4 sm:space-y-4.5">
              {highlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="flex items-start gap-3.5"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#FFFFFF] text-[#7B2FBE] backdrop-blur-md border border-[#DCC2F2] shadow-xs">
                    {highlight.icon}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[13.5px] font-semibold text-white leading-snug">
                      {highlight.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-white/70">
                      {highlight.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal icon components
// ---------------------------------------------------------------------------

function CheckMarkMini() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="size-2.5"
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

// ---------------------------------------------------------------------------
// Exported shared components
// ---------------------------------------------------------------------------

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Image
        src={assetPath("/Logo · SI HER DeFi.png")}
        alt="Si Her DeFi Artwork"
        width={100}
        height={100}
        style={{ width: "auto", height: "auto" }}
      />
      {/* <WordmarkIcon />
      <span className="text-[13.5px] font-bold tracking-[0.16em] text-[#171730]">
        SI HER DEFI
      </span> */}
    </span>
  );
}

/** The standalone orbit SVG — exported so other components (e.g. sidebar) can reuse it. */
export function WordmarkIcon() {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className="size-6 text-[#7c2ae8]"
      fill="none"
    >
      <circle
        cx="14"
        cy="14"
        r="10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeDasharray="48 14"
        strokeDashoffset="8"
      />
      <circle cx="14" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="1.8" fill="currentColor" />
      <line
        x1="2"
        y1="14"
        x2="9"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { UserHeaderAction } from "./user-header-action";

export function BadgeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8.5" r="5" />
      <path d="m8.2 13.5-1.7 7.5 5.5-2.8 5.5 2.8-1.7-7.5" />
    </svg>
  );
}

export function CertificateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}

export function OpportunityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

export function GiftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" rx="1" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

export function WalletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <path d="M16 13a2 2 0 0 1 2-2h4v4h-4a2 2 0 0 1-2-2z" />
      <path d="M4 7V5a2 2 0 0 1 2-2h12" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}
