"use client";

import {
  createFlagStore,
  createPersistentStore,
  usePersistentValue,
} from "@/lib/persistent-store";

/**
 * Cohort progress flags. These were previously read straight out of
 * localStorage in three different components, which meant a write in one
 * place did not re-render the others until the next navigation. Sharing the
 * stores keeps the sidebar, dashboard and certificate page in step.
 */

export const moduleCompletedStore = createFlagStore(
  "siherdefi_collective_capital_done",
);

export const certificateMintedStore = createFlagStore(
  "siherdefi_certificate_minted",
);

export function useModuleCompleted() {
  return usePersistentValue(moduleCompletedStore);
}

export function useCertificateMinted() {
  return usePersistentValue(certificateMintedStore);
}

export type CalendarProvider = "google" | "apple" | "outlook" | "proton" | "custom" | "ics";

/** What the server records for each choice (a plain .ics download is "other"). */
export function calendarTypeFor(provider: CalendarProvider): "google" | "apple" | "outlook" | "proton" | "other" {
  return provider === "custom" || provider === "ics" ? "other" : provider;
}

export const CALENDAR_PROVIDER_LABELS: Record<CalendarProvider, string> = {
  google: "Google Calendar",
  apple: "Apple Calendar",
  outlook: "Outlook",
  proton: "Proton Calendar",
  custom: "your calendar",
  ics: "your calendar",
};

export const scheduledSessionsStore = createPersistentStore<
  Record<string, CalendarProvider>
>(
  "siherdefi_scheduled_sessions",
  {},
  (parsed: unknown) =>
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, CalendarProvider>)
      : {}
);


export function useScheduledSessions() {
  return usePersistentValue(scheduledSessionsStore);
}

/** The certificate is reachable once the cohort task is passed, or already minted. */
export function useCertificateUnlocked() {
  // Both hooks must run unconditionally — `||` on the calls would short-circuit.
  const completed = useModuleCompleted();
  const minted = useCertificateMinted();
  return completed || minted;
}

