// One audio ticket: download the master once, measure it if it's new (step 1), then make
// its preview if one is wanted and missing (step 2). Steps already done are skipped, so a
// retry or a sweep re-send only does what's left.
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AudioProcessJob } from "@ferrel/queues";
import { downloadObjectToFile } from "@ferrel/storage";
import { MissingMasterError } from "./failure";
import { measureStep } from "./measure-step";
import { previewStep } from "./preview-step";
import { audioState, savePreviewFailed } from "./track-audio-store";

export type ProcessOptions = {
  /** This is BullMQ's last attempt: a slow file now counts as failed. */
  lastAttempt: boolean;
  /** Time limit for each FFmpeg run. */
  timeoutMs?: number;
  /** Where temporary files go (tests use their own folder). */
  tempDir?: string;
};

export type ProcessResult = { measured: "ready" | "failed" | "skipped"; preview: "made" | "failed" | "skipped" };

const NOTHING: ProcessResult = { measured: "skipped", preview: "skipped" };

export async function processTrackAudio(ticket: AudioProcessJob, { lastAttempt, timeoutMs = 120_000, tempDir = tmpdir() }: ProcessOptions): Promise<ProcessResult> {
  const state = await audioState(ticket);
  if (!state) return NOTHING; // the song was replaced
  const needsMeasuring = state.status === "processing";
  const wantsPreview = state.previewEnabled && state.previewKey === null && state.previewFailedAt === null;
  if (!needsMeasuring && !(state.status === "ready" && wantsPreview)) return NOTHING;

  // Our own random name: nothing from the upload reaches the file system or FFmpeg's arguments.
  const copy = join(tempDir, `ferrel-${randomUUID()}.${state.format}`);
  let downloaded = false;
  const master = async () => {
    if (!downloaded) {
      if (!(await downloadObjectToFile("masters", ticket.audioKey, copy))) throw new MissingMasterError();
      downloaded = true;
    }
    return copy;
  };

  try {
    let measured: ProcessResult["measured"] = "skipped";
    let durationMs = state.durationMs;
    if (needsMeasuring) {
      const m = await measureStep(ticket, master, state.format, { lastAttempt, timeoutMs });
      measured = m.result;
      if (m.result !== "ready") return { measured, preview: "skipped" };
      durationMs = m.durationMs;
    }
    if (!wantsPreview || durationMs === null) return { measured, preview: "skipped" };
    try {
      const preview = await previewStep(ticket, await master(), state.format, { durationMs, previewStartMs: state.previewStartMs }, { tempDir, timeoutMs });
      return { measured, preview };
    } catch (err) {
      // Ours, never the artist's (the song decoded fine): retry, and after the last attempt
      // record it and stop, so a preview that can't be made isn't retried forever.
      if (!lastAttempt) throw err;
      console.error(`[audio] preview for track ${ticket.trackId} failed on the last attempt: ${(err as Error).message}`);
      await savePreviewFailed(ticket);
      return { measured, preview: "failed" };
    }
  } finally {
    // A failed clean-up must not change the result (e.g. Windows briefly locking the file).
    await rm(copy, { force: true }).catch((err: Error) => console.warn(`[audio] couldn't delete temp file ${copy}: ${err.message}`));
  }
}
