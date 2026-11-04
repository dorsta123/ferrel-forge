"use client";

import { useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRACK_LIMITS } from "@ferrel/db/constants";
import { captionFor, playedBars, timeLabel, windowBars } from "./player-math";
import type { PreviewInfo } from "./types";

/**
 * Play/pause for a 15 s preview over the song's waveform: the previewed part is
 * highlighted and fills as it plays. The audio is fetched only when play is pressed.
 * Key it by `preview.url` so a new preview starts from a clean state.
 */
export function PreviewPlayer({ preview }: { preview: PreviewInfo }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const bars = preview.waveform;
  const w = windowBars(bars.length, preview.durationMs, preview.startMs, preview.lengthMs);
  const played = playedBars(w, currentMs, preview.lengthMs);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card/60 p-3">
      <Button size="icon" className="size-11 shrink-0 rounded-full" aria-label={playing ? "Pause preview" : "Play preview"} onClick={toggle}>
        {playing ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
      </Button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <svg viewBox={`0 0 ${bars.length} 40`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
          <rect x={w.from} width={w.to - w.from} height={40} className="fill-brand/10" />
          {bars.map((v, i) => {
            const h = Math.max(1, (v / TRACK_LIMITS.waveformMax) * 38);
            const inWindow = i >= w.from && i < w.to;
            const tone = inWindow ? (i < played ? "fill-brand" : "fill-brand/45") : "fill-muted-foreground/25";
            return <rect key={i} x={i + 0.15} y={20 - h / 2} width={0.7} height={h} className={tone} />;
          })}
        </svg>
        <p className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">{captionFor(preview.lengthMs)}</span>
          <span data-testid="player-time" className="shrink-0 font-mono whitespace-nowrap tabular-nums">
            {timeLabel(currentMs, preview.lengthMs)}
          </span>
        </p>
        {unavailable && (
          <p role="alert" className="text-xs text-destructive">
            Preview unavailable. Reload the page to get the latest one.
          </p>
        )}
      </div>
      <audio
        ref={audio}
        src={preview.url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentMs(0);
        }}
        onTimeUpdate={(e) => setCurrentMs(e.currentTarget.currentTime * 1000)}
        // e.g. the artist replaced the preview since this page loaded and the old file is gone
        onError={() => {
          setPlaying(false);
          setUnavailable(true);
        }}
      />
    </div>
  );
}
