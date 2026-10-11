'use client';
// Kara's intro video with watch tracking. Uses YouTube IFrame API to count seconds played (skipping ahead doesn't count),
// and calls onProgress / onWatched once 80% is reached.
import { useEffect, useRef } from 'react';

export const WATCH_THRESHOLD = 0.8;

type YTPlayer = { getCurrentTime(): number; getDuration(): number; getPlayerState(): number; destroy(): void };
type YTNamespace = { Player: new (el: HTMLElement, opts: object) => YTPlayer; PlayerState: { PLAYING: number } };
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

let apiReady: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiReady ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return apiReady;
}

export const youtubeId = (url: string) => url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] ?? null;

export function IntroVideo({ url, title, watched, onProgress, onWatched }: {
  url: string; title: string; watched: boolean;
  onProgress?: (fraction: number) => void; onWatched: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef({ onProgress, onWatched, watched });
  cb.current = { onProgress, onWatched, watched };
  const id = youtubeId(url);

  useEffect(() => {
    if (!id || !host.current) return;
    let player: YTPlayer | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let alive = true;
    const seen = new Set<number>();
    let last = -1;
    loadApi().then((YT) => {
      if (!alive || !host.current) return;
      player = new YT.Player(host.current, {
        videoId: id, host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      });
      timer = setInterval(() => {
        if (!player || typeof player.getPlayerState !== 'function') return;
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) { last = -1; return; }
        const t = player.getCurrentTime();
        const d = player.getDuration();
        if (last >= 0 && t > last && t - last < 2) for (let s = Math.floor(last); s < Math.floor(t); s++) seen.add(s);
        last = t;
        if (!d) return;
        const fraction = Math.min(1, seen.size / Math.floor(d));
        cb.current.onProgress?.(fraction);
        if (fraction >= WATCH_THRESHOLD && !cb.current.watched) cb.current.onWatched();
      }, 500);
    });
    return () => { alive = false; clearInterval(timer); player?.destroy?.(); };
  }, [id]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#0e0c18] shadow-md">
      {id ? <div className="absolute inset-0 [&>iframe]:size-full"><div ref={host} title={title} /></div>
        : <p className="absolute inset-0 grid place-items-center text-[12px] text-white/60">The intro video will appear here soon.</p>}
    </div>
  );
}
