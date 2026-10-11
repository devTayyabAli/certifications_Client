"use client";

import { useEffect, useState } from "react";

import { useSignOut } from "@/lib/use-sign-out";
import { Check } from "@/components/ui/Check";

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
          <Check className="size-3" strokeWidth={2.6} />
        </span>
        <span className="text-[12px] font-medium text-[#171730]">{displayEmail}</span>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="cursor-pointer text-[12.5px] font-medium text-[#7c2ae8] transition-colors hover:text-[#6922cf] link-cta"
      >
        Not you?
      </button>
    </div>
  );
}
