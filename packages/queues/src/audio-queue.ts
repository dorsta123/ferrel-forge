// Sending audio tickets (web side). Server-only.
import { Queue } from "bullmq";
import { AUDIO_JOB_OPTIONS, audioJobId, type AudioProcessJob } from "./audio-job";
import { createConnection, queuePrefix } from "./connection";
import { JOB_NAMES, QUEUE_NAMES } from "./names";
import { within } from "./within";

const SEND_LIMIT_MS = 2_000;

let queue: Queue | null = null;

/** The audio queue, created on first use (one per process). */
export function getAudioQueue(): Queue {
  queue ??= new Queue(QUEUE_NAMES.audio, { connection: createConnection("producer"), prefix: queuePrefix() });
  return queue;
}

/**
 * Hand the worker a ticket. Returns false (never throws) if Redis is down or slow:
 * the upload is already saved as "processing", and the worker's sweep re-sends it.
 */
export async function queueAudioProcessing(job: AudioProcessJob): Promise<boolean> {
  const sent = await within(SEND_LIMIT_MS, getAudioQueue().add(JOB_NAMES.audioProcess, job, { ...AUDIO_JOB_OPTIONS, jobId: audioJobId(job) }));
  if (!sent) console.warn(`[queues] couldn't queue audio for track ${job.trackId}; the sweep will retry`);
  return sent;
}

/** Close the connection (tests, shutdown). */
export async function closeQueues(): Promise<void> {
  await queue?.close();
  queue = null;
}
