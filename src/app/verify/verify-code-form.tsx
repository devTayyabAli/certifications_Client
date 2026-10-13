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

import { Button } from "@/components/ui/Button";
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
const BASE_CHAIN_ID = "0x2105";
const RESEND_SECONDS = 40;

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function VerifyCodeForm({ email }: { email: string }) {
  const router = useRouter();
  const { applyApplicationPrefill, resetProfile } = useProfile();
  const { saveWallet, disconnect } = useWallet();

  const [digits, setDigits] = useState<string[]>(Array.from({ length: CODE_LENGTH }, () => ""));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const targetEmail = email.trim().toLowerCase();
  const isComplete = digits.every((d) => d.length === 1);

  const setFrom = (start: number, value: string) => {
    const chars = value.replace(/\D/g, "").slice(0, CODE_LENGTH - start).split("");
    if (!chars.length) return;
    setDigits((d) => {
      const n = [...d];
      chars.forEach((c, i) => {
        n[start + i] = c;
      });
      return n;
    });
    setError(null);
    inputsRef.current[Math.min(start + chars.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      setDigits((d) => {
        const n = [...d];
        if (n[index]) {
          n[index] = "";
        } else if (index > 0) {
          n[index - 1] = "";
          inputsRef.current[index - 1]?.focus();
        }
        return n;
      });
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!isComplete || isVerifying) return;

    const code = digits.join("");
    setIsVerifying(true);
    setError(null);

    try {
      const result = await authApi.verifyOtp(targetEmail, code);

      const previousEmail = getAuthUser()?.email?.toLowerCase();
      if (previousEmail && previousEmail !== targetEmail) disconnect();
      clearLocalSession();
      resetProfile();

      setAuthToken(result.token);
      setAuthUser(result.user);

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

      const next = nextOnboardingRoute({
        name: result.profile?.name,
        walletAddress: result.user.walletAddress,
      });
      router.push(next === "/dashboard" ? "/dashboard" : "/profile");
    } catch (err: any) {
      setError(
        err.message ||
          "Invalid or expired verification code. Please check your inbox or request a new code."
      );
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setDigits(Array.from({ length: CODE_LENGTH }, () => ""));
    setSecondsLeft(RESEND_SECONDS);
    try {
      await authApi.resendOtp(targetEmail);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("siherdefi_dev_code");
      }
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to resend code. Please try again.");
    }
  };

  return (
    <form className="mt-6" onSubmit={handleSubmit} noValidate>
      <div className="flex justify-center gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            autoFocus={index === 0}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
            value={digit}
            disabled={isVerifying}
            onChange={(e) => setFrom(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => {
              e.preventDefault();
              setFrom(0, e.clipboardData.getData("text"));
            }}
            onFocus={(e) => e.target.select()}
            className={`h-12 min-w-0 flex-1 rounded-lg border text-center text-base font-medium text-[#171730] transition outline-none focus:border-[#7c2ae8] focus:ring-2 focus:ring-[#7c2ae8]/20 disabled:opacity-60 ${
              error ? "border-red-400 bg-red-50/50" : "border-[#dcdce8] bg-white"
            }`}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-center text-[12px] font-medium text-red-500">
          {error}
        </p>
      )}

      <div className="mt-5">
        <Button
          type="submit"
          disabled={!isComplete}
          loading={isVerifying}
          loadingLabel="Verifying…"
          showIcon={false}
        >
          Verify email
        </Button>
      </div>

      <p className="mt-4 text-center text-[12px] text-[#5f5f7a]">
        Didn’t get it?{" "}
        {secondsLeft > 0 ? (
          <>
            Resend in{" "}
            <span className="font-medium text-[#151534] tabular-nums">
              {formatCountdown(secondsLeft)}
            </span>
          </>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="font-medium text-[#7b2fbe] underline underline-offset-2 hover:no-underline cursor-pointer"
          >
            Resend code
          </button>
        )}
      </p>
    </form>
  );
}
