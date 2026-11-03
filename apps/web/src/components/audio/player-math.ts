// The preview player's maths (pure).
import { formatDuration } from "@/lib/format-duration";

export type BarWindow = { from: number; to: number };

/** Which waveform bars the preview covers (fractional at the edges). */
export function windowBars(bars: number, durationMs: number, startMs: number, lengthMs: number): BarWindow {
  return { from: (startMs / durationMs) * bars, to: ((startMs + lengthMs) / durationMs) * bars };
}

/** How far into the window the preview has played, in bars. */
export function playedBars(w: BarWindow, currentMs: number, lengthMs: number): number {
  const fraction = Math.min(1, Math.max(0, currentMs / lengthMs));
  return w.from + (w.to - w.from) * fraction;
}

/** "0:04 / 0:15" (elapsed whole seconds, so it ticks like a normal player). */
export function timeLabel(currentMs: number, lengthMs: number): string {
  return `${formatDuration(Math.floor(currentMs / 1000) * 1000)} / ${formatDuration(lengthMs)}`;
}
