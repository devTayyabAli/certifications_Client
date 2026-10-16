'use client';
// Session recording player with custom controls. Chapters and quiz hints can seek into it.
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface PlayerHandle { seek: (seconds: number) => void }

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const VideoPlayer = forwardRef<PlayerHandle, {
  src: string; poster?: string | null; label: string;
  /** called as the video plays, e.g. to track how much of it was watched */
  onTimeUpdate?: (video: HTMLVideoElement) => void;
}>(function VideoPlayer({ src, poster, label, onTimeUpdate }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const toggle = () => { const v = video.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  useImperativeHandle(ref, () => ({
    seek: (s: number) => {
      const v = video.current;
      if (!v) return;
      // Safari ignores a seek before the video's metadata has loaded: wait for it
      const go = () => { v.currentTime = Number.isFinite(v.duration) ? Math.min(s, v.duration) : s; setT(v.currentTime); };
      if (v.readyState >= 1) go();
      else v.addEventListener('loadedmetadata', go, { once: true });
      v.play().catch(() => {});
      box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  }));
  const pct = d ? (t / d) * 100 : 0;
  const chrome = `transition-opacity duration-300 ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`;

  return (
    <div ref={box} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#0e0c18] text-white shadow-md group">
      <video
        aria-label={label}
        ref={video} src={src} poster={poster ?? undefined} preload="metadata" playsInline className="size-full object-cover cursor-pointer" onClick={toggle}
        // the video stays in the app: no browser menu to open it in a new tab or save it
        onContextMenu={(e) => e.preventDefault()} disablePictureInPicture
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => { setT(e.currentTarget.currentTime); onTimeUpdate?.(e.currentTarget); }}
        onLoadedMetadata={(e) => setD(e.currentTarget.duration)}
      />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 ${chrome}`} />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button type="button" onClick={toggle} className="pointer-events-auto grid size-16 place-items-center rounded-full bg-white/25 backdrop-blur-md text-white transition-all hover:scale-110 hover:bg-white/40 cursor-pointer shadow-2xl active:scale-95" aria-label="Play video">
            <svg className="size-7 ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </button>
        </div>
      )}
      <div className={`absolute bottom-0 left-0 right-0 p-4 space-y-2 ${chrome}`}>
        <div
          tabIndex={0} role="slider" aria-label="Seek video" aria-valuenow={Math.round(t)} aria-valuemin={0} aria-valuemax={Math.round(d)} aria-valuetext={`${fmt(t)} of ${fmt(d)}`}
          className="relative h-2 w-full rounded-full bg-white/25 cursor-pointer group/bar transition-all hover:h-2.5 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); if (video.current && d) video.current.currentTime = ((e.clientX - r.left) / r.width) * d; }}
          onKeyDown={(e) => { if (!video.current) return; if (e.key === 'ArrowRight') video.current.currentTime += 5; if (e.key === 'ArrowLeft') video.current.currentTime -= 5; }}
        >
          <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#7c2ae8] to-[#9d4edd]" style={{ width: `${pct}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-white shadow-md transition-transform scale-0 group-hover/bar:scale-100" style={{ left: `calc(${pct}% - 7px)` }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-white/90">
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggle} className="text-white hover:text-[#9d4edd] transition cursor-pointer p-1" aria-label={playing ? 'Pause video' : 'Play video'}>
              {playing ? (
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <span className="tabular-nums text-[11.5px] select-none">{fmt(t)} / {fmt(d)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => { if (video.current) { video.current.muted = !muted; setMuted(!muted); } }} className="text-white/90 hover:text-white transition cursor-pointer p-1" aria-label={muted ? 'Unmute' : 'Mute'}>
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {muted ? <><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></> : <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
              </svg>
            </button>
            <input min="0" max="1" step="0.05" aria-label="Volume" className="hidden w-20 accent-[#9d4edd] sm:block cursor-pointer" type="range" value={volume} onChange={(e) => { const v = Number(e.target.value); setVolume(v); if (video.current) video.current.volume = v; }} />
            <button type="button" onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else box.current?.requestFullscreen(); }} className="text-white/90 hover:text-white transition cursor-pointer p-1" aria-label="Toggle fullscreen">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const toSeconds = (ts: string) => ts.split(':').map(Number).reduce((a, n) => a * 60 + n, 0);
