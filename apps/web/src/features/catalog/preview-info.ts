// Turn a track's preview columns into what the player needs, or null when there's nothing
// to play (processing, previews off, a preview not made yet or given up on). Server-only.
import { TRACK_LIMITS, type AudioStatus } from "@ferrel/db/constants";
import { publicPreviewUrl } from "@ferrel/storage";
import type { PreviewInfo } from "@/components/audio/types";
import { defaultStartMs } from "../preview-settings/rules";

export type PreviewColumns = {
  audioStatus: AudioStatus;
  durationMs: number | null;
  previewEnabled: boolean;
  previewKey: string | null;
  previewStartMs: number | null;
  waveform: number[] | null;
};

export function previewInfo(t: PreviewColumns): PreviewInfo | null {
  if (t.audioStatus !== "ready" || !t.previewEnabled || !t.previewKey || t.durationMs === null || !t.waveform) return null;
  return {
    url: publicPreviewUrl(t.previewKey),
    durationMs: t.durationMs,
    startMs: t.previewStartMs ?? defaultStartMs(t.durationMs),
    lengthMs: Math.min(TRACK_LIMITS.previewMs, t.durationMs),
    waveform: t.waveform,
  };
}
