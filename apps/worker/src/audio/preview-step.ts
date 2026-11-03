// Step 2: the 15-second preview (decision 022), saved to the public bucket. The song
// already decoded while measuring, so a failure here is ours: it throws and is retried.
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { makePreview, previewWindow, type InputFormat } from "@ferrel/audio";
import type { AudioProcessJob } from "@ferrel/queues";
import { deleteObject, newPreviewKey, uploadFile } from "@ferrel/storage";
import { savePreview } from "./track-audio-store";

export async function previewStep(
  ticket: AudioProcessJob,
  master: string,
  format: InputFormat,
  track: { durationMs: number; previewStartMs: number | null },
  { tempDir, timeoutMs }: { tempDir: string; timeoutMs: number },
): Promise<"made" | "skipped"> {
  const out = join(tempDir, `ferrel-${randomUUID()}.mp3`);
  try {
    await makePreview(master, format, out, previewWindow(track.durationMs, track.previewStartMs), { timeoutMs });
    const key = newPreviewKey(ticket.trackId);
    await uploadFile("previews", key, out, "audio/mpeg");
    return (await savePreviewOrDiscard(ticket, key, track.previewStartMs)) ? "made" : "skipped";
  } finally {
    await rm(out, { force: true }).catch(() => {});
  }
}

/**
 * Attach the uploaded preview. If the track changed meanwhile (song replaced, previews
 * switched off, a preview already there, or a new start chosen), delete the file again so
 * nothing stray is left public. `startUsed` is the start the preview was made from.
 */
export async function savePreviewOrDiscard(ticket: AudioProcessJob, key: string, startUsed: number | null): Promise<boolean> {
  if (await savePreview(ticket, key, startUsed)) return true;
  await deleteObject("previews", key);
  return false;
}
