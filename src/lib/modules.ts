import type { ModuleItem } from "@/lib/api";

/**
 * The module a learner should be working on now: the earliest one whose
 * session has happened but isn't passed yet; otherwise the next upcoming
 * session; otherwise the last module.
 */
export function pickCurrentModule(modules: ModuleItem[]): ModuleItem | null {
  if (modules.length === 0) return null;
  const byWeek = [...modules].sort((a, b) => a.week - b.week);
  return (
    byWeek.find((m) => m.sessionState !== "upcoming" && !m.isCompleted) ??
    byWeek.find((m) => m.sessionState === "upcoming") ??
    byWeek[byWeek.length - 1]
  );
}

export function modulePath(m: Pick<ModuleItem, "slug">) {
  return `/module/${encodeURIComponent(m.slug)}`;
}

/** "Thu, Oct 8 · 5:00 PM" in the learner's own time zone. */
export function formatSessionTime(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "in 3 days" / "in 5 hours" / "in 20 minutes" */
export function timeUntil(iso: string | null, now = Date.now()) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}
