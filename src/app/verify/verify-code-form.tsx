"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { primaryButtonClasses } from "@/components/onboarding-shell";
import { useProfile } from "@/components/profile-provider";
import { useWallet } from "@/components/wallet-provider";
import {
  authApi,
  clearLocalSession,
  getAuthUser,
  nextOnboardingRoute,
  setAuthToken,
  setAuthUser,
} from "@/lib/api";

const CODE_LENGTH = 6;
/** Base Mainnet — chain 8453 */
const BASE_CHAIN_ID = "0x2105";
const RESEND_SECONDS = 42;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4 animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function replaceAt(list: string[], index: number, value: string) {
  const next = [...list];
  next[index] = value;
  return next;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// CountdownTimer — isolated so it re-renders independently of the OTP inputs
// ---------------------------------------------------------------------------

function CountdownTimer({
  initialSeconds,
  onExpire,
}: {
  initialSeconds: number;
  onExpire?: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire?.();
      return;
    }
    const timer = window.setTimeout(
      () => setSecondsLeft((s) => s - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [secondsLeft, onExpire]);

  if (secondsLeft <= 0) return null;

  return (
    <>
      Resend in{" "}
      <span className="font-semibold text-ink tabular-nums">
        {formatCountdown(secondsLeft)}
      </span>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function VerifyCodeForm({ email }: { email: string }) {
  const router = useRouter();
  const { applyApplicationPrefill, resetProfile } = useProfile();
  const { saveWallet, disconnect } = useWallet();

  const targetEmail = email.trim().toLowerCase();

  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length: CODE_LENGTH }, () => ""),
  );
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendSignal, setResendSignal] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const isComplete = digits.every((digit) => digit !== "");

  // Ensure OTP boxes always start completely empty
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("siherdefi_dev_code");
    }
  }, []);

  function focusInput(index: number) {
    inputsRef.current[Math.min(Math.max(index, 0), CODE_LENGTH - 1)]?.focus();
  }

  /** Writes `value` across the boxes starting at `index`, then moves focus. */
  function fillFrom(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, CODE_LENGTH - index);
    if (cleaned === "") return;

    if (error) setError("");

    setDigits((previous) => {
      const next = [...previous];
      for (let offset = 0; offset < cleaned.length; offset += 1) {
        next[index + offset] = cleaned[offset];
      }
      return next;
    });
    focusInput(index + cleaned.length);
  }

  function handleChange(index: number, value: string) {
    if (error) setError("");
    if (value === "") {
      setDigits((previous) => replaceAt(previous, index, ""));
      return;
    }
    fillFrom(index, value);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && digits[index] === "" && index > 0) {
      event.preventDefault();
      setDigits((previous) => replaceAt(previous, index - 1, ""));
      focusInput(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusInput(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusInput(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData("text"));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete || isVerifying) return;

    const code = digits.join("");
    setIsVerifying(true);
    setError("");

    try {
      const result = await authApi.verifyOtp(targetEmail, code);

      // Start from a clean slate so nothing from a previous learner on this
      // browser (profile, wallet, progress) leaks into this account. A
      // different learner also gets the live wallet connection dropped.
      const previousEmail = getAuthUser()?.email?.toLowerCase();
      if (previousEmail && previousEmail !== targetEmail) disconnect();
      clearLocalSession();
      resetProfile();

      // Store authenticated credentials
      setAuthToken(result.token);
      setAuthUser(result.user);

      // Populate the learner's saved / application details into profile state
      if (result.profile) {
        applyApplicationPrefill({
          name: result.profile.name,
          role: result.profile.role,
          organization: result.profile.organization,
          socialLink: result.profile.socialLink,
          bio: result.profile.bio,
          photoUrl: result.profile.photoUrl ?? "",
        });
      }
      saveWallet(
        result.user.walletAddress
          ? { address: result.user.walletAddress, chainId: BASE_CHAIN_ID }
          : null,
      );

      // Returning learners who already finished onboarding go straight in;
      // everyone else continues with the profile step.
      const next = nextOnboardingRoute({
        name: result.profile?.name,
        walletAddress: result.user.walletAddress,
      });
      router.push(next === "/dashboard" ? "/dashboard" : "/verified");
    } catch (err: any) {
      setError(
        err.message ||
          "Invalid or expired verification code. Please check your inbox or request a new code."
      );
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setCanResend(false);
    setError("");
    setDigits(Array.from({ length: CODE_LENGTH }, () => ""));
    try {
      await authApi.resendOtp(targetEmail);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("siherdefi_dev_code");
      }
      setResendSignal((n) => n + 1);
      focusInput(0);
    } catch (err: any) {
      setError(err.message || "Failed to resend code. Please try again.");
      setCanResend(true);
    }
  }

  return (
    <form className="mt-6" onSubmit={handleSubmit} noValidate>
      <div className="flex justify-center gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            // Auto-focus the first box so the user can start typing immediately
            autoFocus={index === 0}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
            value={digit}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            disabled={isVerifying}
            className={`h-12 min-w-0 flex-1 rounded-lg border text-center text-base font-semibold text-ink transition outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60 ${
              error
                ? "border-red-400 bg-red-50/50"
                : digit === ""
                ? "border-line bg-white"
                : "border-[#ddd3f5] bg-[#f4f0fd]"
            }`}
          />
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-center text-[12px] font-medium text-red-500"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!isComplete || isVerifying}
        aria-busy={isVerifying}
        className={`mt-5 ${primaryButtonClasses(isComplete ? "active" : "muted")}`}
      >
        {isVerifying ? (
          <>
            <Spinner />
            Verifying…
          </>
        ) : (
          "Verify email"
        )}
      </button>

      <p className="mt-4 text-center text-[12px] text-muted">
        Didn’t get it?{" "}
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className="font-semibold text-brand underline underline-offset-2 hover:no-underline"
          >
            Resend code
          </button>
        ) : (
          <CountdownTimer
            key={resendSignal}
            initialSeconds={RESEND_SECONDS}
            onExpire={() => setCanResend(true)}
          />
        )}
      </p>
    </form>
  );
}
