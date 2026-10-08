"use client";

import { useSyncExternalStore } from "react";

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

const getServerSnapshot = () => "";

/**
 * The current query string (`"?a=1"`), safe to read during render.
 *
 * Next's `useSearchParams` is the right tool when a route is already dynamic,
 * but it opts the route out of static prerendering and requires a Suspense
 * boundary. This reads `window.location.search` through an external store
 * instead: the hydration render sees `""` (matching the server), then React
 * immediately re-renders with the real value. Keeps the page static and
 * avoids hydrating from an effect.
 *
 * It tracks back/forward navigation, not `router.push` — fine for read-once
 * deep links.
 */
export function useQueryString() {
  return useSyncExternalStore(
    subscribeToLocation,
    () => window.location.search,
    getServerSnapshot,
  );
}
