'use client';
// A short confetti shower: ~90 small pieces fall from the top of the screen, drift and spin, then it removes itself.
import { useEffect, useMemo, useState } from 'react';

const COLORS = ['#7c2ae8', '#b76fde', '#c4b5fd', '#f5c84c', '#34c47c', '#ff7a59', '#5e3295'];

export function Confetti({ pieces = 90, duration = 4200 }: { pieces?: number; duration?: number }) {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setTimeout(() => setOn(false), duration + 1200); return () => clearTimeout(t); }, [duration]);
  const bits = useMemo(() => Array.from({ length: pieces }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 900,
    fall: duration * (0.65 + Math.random() * 0.45),
    drift: (Math.random() - 0.5) * 160,
    spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
    w: 6 + Math.random() * 6,
    h: 3 + Math.random() * 5,
    round: i % 4 === 0,
    color: COLORS[i % COLORS.length],
  })), [pieces, duration]);
  if (!on) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden motion-reduce:hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti-bit absolute -top-4"
          style={{
            left: `${b.left}%`, width: b.w, height: b.round ? b.w : b.h, background: b.color, borderRadius: b.round ? 999 : 2,
            animationDuration: `${b.fall}ms`, animationDelay: `${b.delay}ms`,
            ['--drift' as string]: `${b.drift}px`, ['--spin' as string]: `${b.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}
