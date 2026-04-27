import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoProps {
  src: string;
  poster?: string;
  className?: string;
}

const formatTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const minutes = Math.floor(s / 60);
  const seconds = Math.floor(s % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

/**
 * Compact, accessible media player for tier-locked videos in the feed.
 *
 * - Click anywhere on the surface to play/pause.
 * - Tracks currentTime via the rAF-friendly timeupdate event so the
 *   scrub bar stays in sync without re-renders on every paint.
 * - Mute, fullscreen, and seek controls always reachable by keyboard.
 * - Lazy preload metadata so a long feed doesn't pre-fetch payloads.
 */
export const VideoPlayer = ({ src, poster, className }: VideoProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setProgress(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
  };

  const fullscreen = () => {
    const v = ref.current;
    if (!v) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void v.requestFullscreen();
    }
  };

  return (
    <div className={cn("relative overflow-hidden border-2 border-ink bg-ink", className)}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        playsInline
        preload="metadata"
        onClick={toggle}
        className="block aspect-video w-full bg-ink object-cover"
      />

      {!playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center bg-ink/30 text-ink-foreground hover:bg-ink/40"
        >
          <span className="flex h-14 w-14 items-center justify-center border-2 border-ink-foreground bg-ink/70">
            <Play className="h-6 w-6 fill-current" />
          </span>
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-ink/70 px-3 py-2 text-ink-foreground">
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"}
          className="flex h-7 w-7 items-center justify-center hover:opacity-80">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <span className="font-mono text-[10px] tabular-nums">
          {formatTime(progress)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 0.1)}
          step={0.1}
          value={progress}
          onChange={onSeek}
          aria-label="Seek"
          className="h-1 flex-1 accent-accent"
        />
        <button type="button" onClick={() => setMuted((v) => !v)}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={!muted}
          className="flex h-7 w-7 items-center justify-center hover:opacity-80">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button type="button" onClick={fullscreen} aria-label="Toggle fullscreen"
          className="flex h-7 w-7 items-center justify-center hover:opacity-80">
          <Maximize className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;
