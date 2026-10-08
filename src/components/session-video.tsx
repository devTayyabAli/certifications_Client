"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";

/**
 * Video player for CMS-managed recordings. Plays direct files (Pinata/IPFS,
 * MP4…) in a custom HTML5 player and hosted videos (YouTube, Vimeo, Loom,
 * Google Drive) in their own embed. Parents can jump to a timestamp — e.g. a
 * chapter or a quiz hint — through the `ref`.
 */

export interface SessionVideoHandle {
  /** Seek to a point (seconds) and start playing */
  seekTo: (seconds: number) => void;
}

type Embed = { provider: "youtube" | "vimeo" | "loom" | "drive"; id: string };

function parseEmbed(url: string): Embed | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      return id ? { provider: "youtube", id } : null;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? { provider: "youtube", id } : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.match(/(\d+)/)?.[1];
      return id ? { provider: "vimeo", id } : null;
    }
    if (host === "loom.com") {
      const id = u.pathname.match(/\/(?:share|embed)\/([a-z0-9]+)/i)?.[1];
      return id ? { provider: "loom", id } : null;
    }
    if (host === "drive.google.com") {
      const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
      return id ? { provider: "drive", id } : null;
    }
  } catch {
    // not a URL we recognise — treated as a direct file
  }
  return null;
}

function embedSrc(embed: Embed, startSeconds: number | null) {
  const start = startSeconds !== null ? Math.max(0, Math.floor(startSeconds)) : null;
  switch (embed.provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${embed.id}?rel=0${start !== null ? `&start=${start}&autoplay=1` : ""}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${embed.id}${start !== null ? `?autoplay=1#t=${start}s` : ""}`;
    case "loom":
      return `https://www.loom.com/embed/${embed.id}${start !== null ? `?t=${start}&autoplay=1` : ""}`;
    case "drive":
      return `https://drive.google.com/file/d/${embed.id}/preview`;
  }
}

/** True for YouTube / Vimeo / Loom / Drive links (played in their own embed). */
export function isHostedVideo(url: string) {
  return parseEmbed(url) !== null;
}

/** "3:15" / "1:02:30" → seconds */
export function timestampToSeconds(value: string): number {
  const parts = value.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

function formatTime(secs: number) {
  if (!Number.isFinite(secs) || secs < 0) return "0:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Share of the video that counts as "watched". */
const WATCHED_FRACTION = 0.9;

export default function SessionVideo({
  ref,
  url,
  posterUrl,
  caption,
  lengthLabel,
  onWatched,
  onSeek,
}: {
  ref?: Ref<SessionVideoHandle>;
  url: string;
  posterUrl?: string;
  caption?: string;
  /** Shown in the corner while paused, e.g. "2 MIN INTRO" */
  lengthLabel?: string;
  /** Fired once, when ~90% of a direct file has played or it ends */
  onWatched?: () => void;
  /** Fired with the current time whenever the learner seeks */
  onSeek?: (seconds: number) => void;
}) {
  const embed = parseEmbed(url);
  const [embedStart, setEmbedStart] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reportedWatched = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [loadFailed, setLoadFailed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      seekTo(seconds: number) {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (embed) {
          setEmbedStart(seconds);
          return;
        }
        const el = videoRef.current;
        if (!el) return;
        el.currentTime = seconds;
        setCurrentTime(seconds);
        el.play().catch(() => {});
      },
    }),
    [embed],
  );

  if (embed) {
    return (
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#0e0c18] shadow-md"
      >
        <iframe
          // Re-mount on seek so the player starts at the new point
          key={embedStart ?? "start"}
          src={embedSrc(embed, embedStart)}
          title={caption || "Session video"}
          className="absolute inset-0 size-full"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      </div>
    );
  }

  const reportWatched = () => {
    if (reportedWatched.current) return;
    reportedWatched.current = true;
    onWatched?.();
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setLoadFailed(true));
    else el.pause();
  };

  const seekTo = (seconds: number) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    el.currentTime = Math.max(0, Math.min(duration, seconds));
    setCurrentTime(el.currentTime);
    onSeek?.(el.currentTime);
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * duration);
  };

  const handleSeekKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") seekTo(currentTime + 5);
    else if (e.key === "ArrowLeft") seekTo(currentTime - 5);
    else return;
    e.preventDefault();
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  const changeVolume = (value: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = value;
    el.muted = value === 0;
    setVolume(value);
    setIsMuted(el.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const controlsVisibility = isPlaying
    ? "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
    : "opacity-100";

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#0e0c18] text-white shadow-md group"
    >
      <video
        ref={videoRef}
        src={url}
        poster={posterUrl}
        preload="metadata"
        className="size-full object-cover cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (!el) return;
          setCurrentTime(el.currentTime);
          if (Number.isFinite(el.duration) && el.duration > 0) {
            setDuration(el.duration);
            if (el.currentTime / el.duration >= WATCHED_FRACTION) reportWatched();
          }
        }}
        onLoadedMetadata={() => {
          const el = videoRef.current;
          if (el && Number.isFinite(el.duration)) setDuration(el.duration);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          reportWatched();
        }}
        onError={() => setLoadFailed(true)}
        playsInline
      />

      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 transition-opacity duration-300 ${controlsVisibility}`}
      />

      {(caption || lengthLabel) && (
        <div
          className={`absolute top-4 left-4 right-4 flex items-center justify-between text-[11px] font-mono tracking-wider text-white/80 transition-opacity duration-300 ${controlsVisibility}`}
        >
          <span className="truncate max-w-[180px] sm:max-w-none text-[10px] sm:text-[11px]">{caption}</span>
          {lengthLabel && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-sans font-semibold text-white/90">
              <span className={`size-1.5 rounded-full ${isPlaying ? "bg-emerald-400 animate-pulse" : "bg-white/60"}`} />
              {isPlaying ? "PLAYING" : lengthLabel}
            </span>
          )}
        </div>
      )}

      {loadFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-[13px] text-white/90">
          We couldn’t load the video. Please refresh the page or try again later.
        </div>
      )}

      {!isPlaying && !loadFailed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            type="button"
            onClick={togglePlay}
            className="pointer-events-auto grid size-16 place-items-center rounded-full bg-white/25 backdrop-blur-md text-white transition-all hover:scale-110 hover:bg-white/40 cursor-pointer shadow-2xl active:scale-95"
            aria-label="Play video"
          >
            <svg className="size-7 ml-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}

      <div className={`absolute bottom-0 left-0 right-0 p-4 space-y-2 transition-opacity duration-300 ${controlsVisibility}`}>
        <div
          onClick={handleSeekClick}
          onKeyDown={handleSeekKey}
          tabIndex={0}
          className="relative h-2 w-full rounded-full bg-white/25 cursor-pointer group/bar transition-all hover:h-2.5 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          role="slider"
          aria-label="Seek video"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        >
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#7c2ae8] to-[#9d4edd]"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-white shadow-md transition-transform scale-0 group-hover/bar:scale-100"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/90">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="text-white hover:text-[#9d4edd] transition cursor-pointer p-1"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? (
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="font-mono text-[11.5px] select-none tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleMute}
              className="text-white/90 hover:text-white transition cursor-pointer p-1"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg className="size-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden w-20 accent-[#9d4edd] sm:block cursor-pointer"
            />
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-white/90 hover:text-white transition cursor-pointer p-1"
              aria-label="Toggle fullscreen"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
