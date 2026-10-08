"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed store that can be read during render.
 *
 * Why this exists: reading `localStorage` inside `useEffect` and calling
 * `setState` with the result causes a cascading re-render, a visible flash of
 * the default value, and trips `react-hooks/set-state-in-effect`. Going
 * through `useSyncExternalStore` instead means React renders the server
 * snapshot during hydration and the real value immediately after, with no
 * extra render pass and no mismatch.
 *
 * Create one per key at module scope so `subscribe` and `get` keep stable
 * identities across renders.
 */

type Listener = () => void;

export type PersistentStore<T> = {
  /** Current value. Cached, so repeated calls return a stable reference. */
  get: () => T;
  set: (value: T) => void;
  /** Reset to the fallback and drop the stored entry. */
  clear: () => void;
  subscribe: (listener: Listener) => () => void;
  getServerSnapshot: () => T;
};

export function createPersistentStore<T>(
  key: string,
  fallback: T,
  /** Repairs whatever was parsed out of storage — shape drift, older writes. */
  normalize: (parsed: unknown) => T = (parsed) => parsed as T,
): PersistentStore<T> {
  const listeners = new Set<Listener>();

  let snapshot: T = fallback;
  let lastRaw: string | null = null;
  let primed = false;
  /** Set once a write fails (private mode, quota) — we stop reading storage. */
  let memoryOnly = false;

  function notify() {
    for (const listener of listeners) listener();
  }

  function get(): T {
    if (typeof window === "undefined") return fallback;
    if (memoryOnly) return snapshot;

    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      memoryOnly = true;
      return snapshot;
    }

    // Only re-parse when the underlying string actually changed, so the
    // returned reference stays stable for useSyncExternalStore.
    if (!primed || raw !== lastRaw) {
      lastRaw = raw;
      primed = true;
      if (raw === null) {
        snapshot = fallback;
      } else {
        try {
          snapshot = normalize(JSON.parse(raw));
        } catch {
          snapshot = fallback;
        }
      }
    }
    return snapshot;
  }

  function set(value: T) {
    snapshot = value;
    primed = true;
    try {
      const raw = JSON.stringify(value);
      window.localStorage.setItem(key, raw);
      lastRaw = raw;
    } catch {
      memoryOnly = true;
    }
    notify();
  }

  function clear() {
    snapshot = fallback;
    lastRaw = null;
    primed = true;
    try {
      window.localStorage.removeItem(key);
    } catch {
      memoryOnly = true;
    }
    notify();
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    // A write in another tab must re-render this one too. `key === null`
    // means the whole store was cleared.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { get, set, clear, subscribe, getServerSnapshot: () => fallback };
}

/** Subscribe a component to a store. Re-renders on same-tab and cross-tab writes. */
export function usePersistentValue<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.get,
    store.getServerSnapshot,
  );
}

/** Convenience for the `"true"`-flag keys the cohort progress uses. */
export function createFlagStore(key: string) {
  return createPersistentStore<boolean>(key, false, (parsed) => parsed === true);
}
