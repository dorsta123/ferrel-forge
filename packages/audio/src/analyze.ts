// Exact length + waveform in one decode (the spike's recipe, docs/spikes/ffmpeg.md):
// decode to mono 8 kHz 16-bit samples, count them (length = samples / 8000),
// and keep the loudest sample of every 50 ms window. Streams, so a 4-hour file
// needs a few MB of memory, not hundreds.
import { AudioToolError } from "./errors";
import { localInput, runFfmpeg } from "./run-ffmpeg";

export const PEAK_COUNT = 200;
const SAMPLE_RATE = 8_000;
const WINDOW_SAMPLES = 400; // 50 ms

export type AudioAnalysis = {
  /** Exact length, from the decoded sample count. */
  durationMs: number;
  /** PEAK_COUNT values from 0 (silence) to 1 (full scale), for drawing the waveform. */
  peaks: number[];
};

export async function analyzeAudio(file: string, { timeoutMs = 120_000 }: { timeoutMs?: number } = {}): Promise<AudioAnalysis> {
  const windows: number[] = [];
  let windowMax = 0;
  let inWindow = 0;
  let samples = 0;
  let carry: Buffer | null = null; // a sample split across two chunks

  const onStdout = (chunk: Buffer) => {
    const buf: Buffer = carry ? Buffer.concat([carry, chunk]) : chunk;
    const usable = buf.length - (buf.length % 2);
    for (let i = 0; i < usable; i += 2) {
      const level = Math.abs(buf.readInt16LE(i));
      if (level > windowMax) windowMax = level;
      if (++inWindow === WINDOW_SAMPLES) {
        windows.push(windowMax);
        windowMax = 0;
        inWindow = 0;
      }
    }
    samples += usable / 2;
    carry = usable < buf.length ? buf.subarray(usable) : null;
  };

  await runFfmpeg([...localInput(file), "-map", "0:a:0", "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "pipe:1"], { timeoutMs, onStdout });
  if (inWindow > 0) windows.push(windowMax);
  if (samples === 0) throw new AudioToolError("NO_AUDIO", "The file contains no audio.");

  return { durationMs: Math.round((samples / SAMPLE_RATE) * 1000), peaks: toPeaks(windows, PEAK_COUNT) };
}

/** Group window maxima into `count` peaks (stretching when there are fewer windows), scaled to 0..1. */
export function toPeaks(windows: readonly number[], count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const start = Math.floor((i * windows.length) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * windows.length) / count));
    let max = 0;
    for (let j = start; j < end && j < windows.length; j++) max = Math.max(max, windows[j]);
    return Math.min(1, Math.round((max / 32_768) * 1000) / 1000);
  });
}
