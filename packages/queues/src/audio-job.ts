import { createHash } from "node:crypto";
import type { JobsOptions } from "bullmq";

/** The ticket: which track, and the exact file uploaded (so a replaced file's old ticket can be spotted). */
export type AudioProcessJob = { trackId: string; audioKey: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Same track + same file → same id, so BullMQ ignores a duplicate while one is
 * waiting or running. A new file → a new id. (BullMQ ids can't contain ":".)
 */
export function audioJobId(job: AudioProcessJob): string {
  return `audio-${createHash("sha256").update(`${job.trackId}\n${job.audioKey}`).digest("hex").slice(0, 32)}`;
}

/** The ticket as read back from Redis, or null if it isn't exactly a well-formed ticket. */
export function parseAudioJob(data: unknown): AudioProcessJob | null {
  if (typeof data !== "object" || data === null) return null;
  const keys = Object.keys(data).sort().join(",");
  const { trackId, audioKey } = data as Record<string, unknown>;
  if (keys !== "audioKey,trackId") return null;
  if (typeof trackId !== "string" || !UUID.test(trackId)) return null;
  if (typeof audioKey !== "string" || audioKey.length === 0 || audioKey.length > 300) return null;
  return { trackId, audioKey };
}

/**
 * A few retries with growing waits. Finished and failed tickets are removed, so the
 * same file can be queued again later (re-upload, sweep); the track row, not Redis,
 * records the outcome.
 */
export const AUDIO_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 10_000 },
  removeOnComplete: true,
  removeOnFail: true,
};
