"use client";

// Wraps the few parts of the app that use wallet hooks (the wallet step, the
// on-chain claim dialog). The wallet libraries load when one of these mounts;
// until then `fallback` shows. Components inside must themselves be loaded
// with next/dynamic, or their wallet imports would land in the page bundle.
import { useEffect, useState, type ReactNode } from "react";
import { loadWeb3 } from "@/lib/web3/load";

type Web3Runtime = Awaited<ReturnType<typeof loadWeb3>>;

export function Web3Boundary({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [runtime, setRuntime] = useState<Web3Runtime | null>(null);

  useEffect(() => {
    let alive = true;
    loadWeb3().then((m) => {
      if (alive) setRuntime(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!runtime) return <>{fallback}</>;
  const { Web3Providers } = runtime;
  return <Web3Providers>{children}</Web3Providers>;
}
