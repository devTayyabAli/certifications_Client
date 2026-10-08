"use client";

import { useEffect, useState } from "react";

import { useSignOut } from "@/lib/use-sign-out";

export function UserHeaderAction({
  email = "",
}: {
  email?: string;
}) {
  const [activeEmail, setActiveEmail] = useState(email);
  const signOut = useSignOut();

  useEffect(() => {
    if (!email && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("siherdefi_auth_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.email) setActiveEmail(parsed.email);
        }
      } catch {
        // fallback
      }
    }
  }, [email]);

  const displayEmail = activeEmail || email;
  if (!displayEmail) return null;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5 rounded-full border border-[#e3e3ed] bg-white px-2.5 py-1 shadow-xs">
        <span className="grid size-4 place-items-center rounded-full bg-[#16a34a] text-white">
          <svg
            className="size-2.5"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2.5 6 5 8.5 9.5 3.5" />
          </svg>
        </span>
        <span className="text-[12px] font-medium text-[#171730]">{displayEmail}</span>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="cursor-pointer text-[12.5px] font-semibold text-[#7c2ae8] transition-colors hover:text-[#6922cf] hover:underline"
      >
        Not you?
      </button>
    </div>
  );
}
