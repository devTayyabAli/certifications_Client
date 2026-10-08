"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { primaryButtonClasses } from "@/components/onboarding-shell";
import { authApi, fetchNextOnboardingRoute, isAuthenticated } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export default function ClaimSeatForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Someone who is already signed in has nothing to do here — resume their
  // onboarding where they left off.
  useEffect(() => {
    if (!isAuthenticated()) return;
    let cancelled = false;
    fetchNextOnboardingRoute()
      .then((next) => {
        if (!cancelled) router.replace(next);
      })
      .catch(() => {
        // Stale token (handled by the API client) or backend down — stay here
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const trimmed = email.trim();
  const isEmpty = trimmed === "";
  const isInvalid = !isEmpty && !EMAIL_RE.test(trimmed);

  function handleChange(value: string) {
    setEmail(value);
    // Clear error as the user types so feedback feels live
    if (error) setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEmpty) return;

    if (!EMAIL_RE.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await authApi.claimSeat(trimmed);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("siherdefi_dev_code");
      }
      router.push(`/verify?email=${encodeURIComponent(trimmed)}`);
    } catch (err: any) {
      setError(
        err.message ||
          "This email is not registered for Si Her DeFi. Please use the email you applied with."
      );
      setIsSubmitting(false);
    }
  }

  const buttonVariant = isEmpty || isSubmitting ? "muted" : "active";

  return (
    <form className="mt-5" onSubmit={handleSubmit} noValidate>
      <label htmlFor="email" className="block text-[13px] font-medium text-ink">
        Email address
      </label>

      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => handleChange(e.target.value)}
        aria-invalid={isInvalid || !!error}
        aria-describedby={error ? "email-error" : undefined}
        disabled={isSubmitting}
        className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink transition outline-none placeholder:text-placeholder focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-400 focus:ring-red-200"
            : "border-line focus:border-brand focus:ring-brand/20"
        } disabled:opacity-60`}
      />

      {error && (
        <p id="email-error" role="alert" className="mt-1.5 text-[12px] text-red-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isEmpty || isSubmitting}
        aria-busy={isSubmitting}
        className={`mt-4 ${primaryButtonClasses(buttonVariant)}`}
      >
        {isSubmitting ? (
          <>
            <Spinner />
            Sending…
          </>
        ) : (
          <>
            Send my code
            <span aria-hidden="true">→</span>
          </>
        )}
      </button>
    </form>
  );
}
