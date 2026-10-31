import { TRACK_LIMITS } from "@ferrel/db/constants";

/**
 * `analyzeAudio`'s peaks (0–1) as the stored waveform: whole numbers 0–1000, exactly
 * TRACK_LIMITS.waveformBars of them (decision 025). Throws if the count is wrong.
 */
export function toWaveformBars(peaks: readonly number[]): number[] {
  if (peaks.length !== TRACK_LIMITS.waveformBars) {
    throw new Error(`Expected ${TRACK_LIMITS.waveformBars} peaks, got ${peaks.length}.`);
  }
  const max = TRACK_LIMITS.waveformMax;
  return peaks.map((p) => Math.min(max, Math.max(0, Math.round(p * max))));
}
