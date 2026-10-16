"use client";

// The current time for countdowns ("Starts in 5 hours"), shared by every
// component and refreshed once a minute. On the server (and while hydrating)
// it is 0, so time-dependent text only appears in the browser, with no mismatch.
import { useSyncExternalStore } from "react";

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 60 * 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Milliseconds since the epoch in the browser (updated every minute); 0 on the server. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, () => 0);
}
