// Step 1: measure the song (decision 027). Length + waveform in one FFmpeg pass.
import { analyzeAudio, type InputFormat } from "@ferrel/audio";
import { TRACK_LIMITS } from "@ferrel/db/constants";
import type { AudioProcessJob } from "@ferrel/queues";
import { classifyFailure, TooLongError } from "./failure";
import { saveFailed, saveMeasured } from "./track-audio-store";
import { toWaveformBars } from "./waveform-bars";

export type MeasureResult = { result: "ready"; durationMs: number } | { result: "failed" | "skipped" };

/**
 * Measure the master and save the result. `master` downloads it on first call, so a
 * missing master is judged like any other measuring failure. Throws to retry when the
 * problem is ours.
 */
export async function measureStep(
  ticket: AudioProcessJob,
  master: () => Promise<string>,
  format: InputFormat,
  { lastAttempt, timeoutMs }: { lastAttempt: boolean; timeoutMs: number },
): Promise<MeasureResult> {
  try {
    // Read at most a second past the limit: enough to tell "too long" without decoding all of it.
    const { durationMs, peaks } = await analyzeAudio(await master(), format, { timeoutMs, maxMs: TRACK_LIMITS.durationMaxMs + 1_000 });
    if (durationMs > TRACK_LIMITS.durationMaxMs) throw new TooLongError();
    const saved = await saveMeasured(ticket, { durationMs, waveform: toWaveformBars(peaks) });
    return saved ? { result: "ready", durationMs } : { result: "skipped" };
  } catch (err) {
    const decision = classifyFailure(err, { lastAttempt });
    if (decision.action === "retry") throw err;
    return { result: (await saveFailed(ticket, decision.reason)) ? "failed" : "skipped" };
  }
}
