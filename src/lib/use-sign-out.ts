"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useProfile } from "@/components/profile-provider";
import { useWallet } from "@/components/wallet-provider";
import { authApi, isAuthenticated } from "@/lib/api";

/**
 * Fully signs the learner out: ends the session, forgets the connected
 * wallet, and wipes cached profile / progress so the next person on this
 * browser starts clean.
 */
export function useSignOut() {
  const router = useRouter();
  const { disconnect } = useWallet();
  const { resetProfile } = useProfile();

  return useCallback(async () => {
    disconnect();
    resetProfile();
    if (isAuthenticated()) {
      await authApi.logout();
    }
    router.replace("/login");
  }, [disconnect, resetProfile, router]);
}
