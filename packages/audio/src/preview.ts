// The 15-second preview (decision 022): a window of the song with one soft
// watermark tone in its middle, as MP3. Recipe proven in the spike (docs/spikes/ffmpeg.md).
import { localInput, runFfmpeg, type InputFormat } from "./run-ffmpeg";

/** Preview length; must match TRACK_LIMITS.previewMs in @ferrel/db. */
export const PREVIEW_MS = 15_000;
const DEFAULT_START = 0.25; // about 25% in, until the artist picks a start
const TONE = "sine=frequency=1000:sample_rate=44100:duration=0.6";

export type PreviewWindow = { startMs: number; lengthMs: number; toneAtMs: number };

/**
 * Where the preview starts and how long it is: the artist's start (or 25% in), pulled
 * back so 15 s fit; the whole track if it's shorter. The tone sits at 7.5 s (or the middle).
 */
export function previewWindow(durationMs: number, chosenStartMs: number | null): PreviewWindow {
  const lengthMs = Math.min(PREVIEW_MS, durationMs);
  const wanted = chosenStartMs ?? Math.round(durationMs * DEFAULT_START);
  const startMs = Math.max(0, Math.min(wanted, durationMs - lengthMs));
  return { startMs, lengthMs, toneAtMs: Math.round(lengthMs / 2) };
}

const seconds = (ms: number) => (ms / 1000).toFixed(3);

/** Write the preview of `master` to `out` (an .mp3 path we chose). */
export async function makePreview(master: string, format: InputFormat, out: string, w: PreviewWindow, { timeoutMs = 60_000 } = {}): Promise<void> {
  const tone = String(w.toneAtMs);
  const filters = [
    "[0:a]aresample=44100,aformat=channel_layouts=stereo[m]",
    `[1:a]volume=0.25,afade=t=in:d=0.05,afade=t=out:st=0.55:d=0.05,adelay=${tone}|${tone},aformat=channel_layouts=stereo[w]`,
    `[m][w]amix=inputs=2:duration=first:normalize=0,atrim=0:${seconds(w.lengthMs)}[out]`,
  ].join(";");
  await runFfmpeg(
    [
      "-y",
      ...localInput(master, format, ["-ss", seconds(w.startMs), "-t", seconds(w.lengthMs)]),
      "-f", "lavfi", "-i", TONE,
      "-filter_complex", filters,
      "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "128k", "-f", "mp3", out,
    ],
    { timeoutMs },
  );
}
