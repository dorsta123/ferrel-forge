// Measure one uploaded song: exact length + waveform in one FFmpeg pass (phase 4 slice 5).
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeAudio } from "@ferrel/audio";
import { TRACK_LIMITS } from "@ferrel/db/constants";
import type { AudioProcessJob } from "@ferrel/queues";
import { downloadObjectToFile } from "@ferrel/storage";
import { classifyFailure, MissingMasterError, TooLongError } from "./failure";
import { formatIfCurrent, saveFailed, saveMeasured } from "./track-audio-store";
import { toWaveformBars } from "./waveform-bars";

export type MeasureOptions = {
  /** This is BullMQ's last attempt: a slow file now counts as failed. */
  lastAttempt: boolean;
  /** Time limit for FFmpeg. */
  timeoutMs?: number;
  /** Where the temporary copy goes (tests use their own folder). */
  tempDir?: string;
};

/**
 * "ready" or "failed" when saved, "skipped" for an out-of-date ticket.
 * Throws to make BullMQ retry when the problem is ours, not the file's.
 */
export async function measureTrack(ticket: AudioProcessJob, { lastAttempt, timeoutMs = 120_000, tempDir = tmpdir() }: MeasureOptions): Promise<"ready" | "failed" | "skipped"> {
  const format = await formatIfCurrent(ticket);
  if (!format) return "skipped";

  // Our own random name: nothing from the upload reaches the file system or FFmpeg's arguments.
  const copy = join(tempDir, `ferrel-${randomUUID()}.${format}`);
  try {
    if (!(await downloadObjectToFile("masters", ticket.audioKey, copy))) throw new MissingMasterError();
    const { durationMs, peaks } = await analyzeAudio(copy, format, { timeoutMs });
    if (durationMs > TRACK_LIMITS.durationMaxMs) throw new TooLongError();
    return (await saveMeasured(ticket, { durationMs, waveform: toWaveformBars(peaks) })) ? "ready" : "skipped";
  } catch (err) {
    const decision = classifyFailure(err, { lastAttempt });
    if (decision.action === "retry") throw err;
    return (await saveFailed(ticket, decision.reason)) ? "failed" : "skipped";
  } finally {
    await rm(copy, { force: true });
  }
}
