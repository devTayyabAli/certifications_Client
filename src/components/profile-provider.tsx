"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import {
  createPersistentStore,
  usePersistentValue,
} from "@/lib/persistent-store";

// ---------------------------------------------------------------------------
// Types & Defaults
// ---------------------------------------------------------------------------

export type UserProfile = {
  name: string;
  role: string;
  organization: string;
  socialLink: string;
  bio: string;
  photoUrl: string | null;
};

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  role: "",
  organization: "",
  socialLink: "",
  bio: "",
  photoUrl: "",
};

const STORAGE_KEY = "siherdefi_user_profile";
const PREFILL_KEY = "siherdefi_profile_prefill";

type ProfileContextValue = {
  profile: UserProfile;
  /**
   * Fields populated from the member's Si Her DeFi application, rather than
   * typed by the member. Empty unless `applyApplicationPrefill` has run, so
   * the "we filled this in for you" copy only shows when that is true.
   */
  prefilledFields: (keyof UserProfile)[];
  applyApplicationPrefill: (values: Partial<UserProfile>) => void;
  saveProfile: (updates: Partial<UserProfile>) => void;
  resetProfile: () => void;
};

function hasValue(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() !== "" : false;
}

/** Older writes may predate a field, so always merge over the defaults. */
const profileStore = createPersistentStore<UserProfile>(
  STORAGE_KEY,
  DEFAULT_PROFILE,
  (parsed) => ({ ...DEFAULT_PROFILE, ...(parsed as Partial<UserProfile>) }),
);

const prefillStore = createPersistentStore<(keyof UserProfile)[]>(
  PREFILL_KEY,
  [],
  (parsed) =>
    Array.isArray(parsed)
      ? parsed.filter(
          (key): key is keyof UserProfile =>
            typeof key === "string" && key in DEFAULT_PROFILE,
        )
      : [],
);

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ProfileContext = createContext<ProfileContextValue>({
  profile: DEFAULT_PROFILE,
  prefilledFields: [],
  applyApplicationPrefill: () => { },
  saveProfile: () => { },
  resetProfile: () => { },
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ProfileProvider({ children }: { children: ReactNode }) {
  // Read during render — no hydration flash, and one write re-renders every
  // consumer in this tab and any other.
  const profile = usePersistentValue(profileStore);
  const prefilledFields = usePersistentValue(prefillStore);

  /**
   * Populates the form from the member's application and records which fields
   * came from it. Call this once the application data is fetched; until then
   * nothing is marked as prefilled.
   */
  const applyApplicationPrefill = useCallback(
    (values: Partial<UserProfile>) => {
      const keys = Object.keys(values) as (keyof UserProfile)[];
      profileStore.set({ ...profileStore.get(), ...values });
      prefillStore.set(keys.filter((key) => hasValue(values[key])));
    },
    [],
  );

  const saveProfile = useCallback((updates: Partial<UserProfile>) => {
    profileStore.set({ ...profileStore.get(), ...updates });
  }, []);

  const resetProfile = useCallback(() => {
    profileStore.clear();
    prefillStore.clear();
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        prefilledFields,
        applyApplicationPrefill,
        saveProfile,
        resetProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfile() {
  return useContext(ProfileContext);
}
