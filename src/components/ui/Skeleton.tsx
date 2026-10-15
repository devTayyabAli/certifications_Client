// Loading placeholders shaped like the content they stand in for, so a page
// keeps its layout while its data loads instead of jumping from a spinner.
import type { ReactNode } from "react";

/** One grey block; size and shape come from `className` (e.g. "h-4 w-40", "h-32 rounded-2xl"). */
export function Skeleton({ className = "" }: { className?: string }) {
  // gently rounded unless the caller picks a shape (rounded-full for avatars and pills)
  const shape = /\brounded/.test(className) ? "" : "rounded-lg";
  return <div aria-hidden="true" className={`animate-pulse bg-[#ececf2] motion-reduce:animate-none ${shape} ${className}`} />;
}

/** Wraps a page's skeleton: announced once to screen readers as loading. */
export function SkeletonPage({ label = "Loading", className = "", children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}
