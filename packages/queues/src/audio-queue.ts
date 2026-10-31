// Sending audio tickets (web side). Server-only.
import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { AUDIO_JOB_OPTIONS, audioJobId, type AudioProcessJob } from "./audio-job";
import { createConnection, queuePrefix } from "./connection";
import { JOB_NAMES, QUEUE_NAMES } from "./names";
import { onceEvery } from "./once-every";
import { within } from "./within";

const SEND_LIMIT_MS = 2_000;

let queue: Queue | null = null;
let client: Redis | null = null;

// While Redis is down the client retries every couple of seconds; say so once a minute, not each time.
const logRedisError = onceEvery(60_000, (err: Error) => console.error(`[queues] Redis unavailable: ${err.message}`));

/** The audio queue, created on first use (one per process). */
export function getAudioQueue(): Queue {
  if (!queue) {
    client = createConnection("producer");
    queue = new Queue(QUEUE_NAMES.audio, { connection: client, prefix: queuePrefix() });
    queue.on("error", logRedisError);
  }
  return queue;
}

/**
 * Hand the worker a ticket. Returns false (never throws) if it isn't confirmed within
 * 2 s: the upload is already saved as "processing", and the worker's sweep re-sends it.
 * (The send may still complete once Redis is back; the ticket id makes that harmless.)
 */
export async function queueAudioProcessing(job: AudioProcessJob): Promise<boolean> {
  const sent = await within(SEND_LIMIT_MS, getAudioQueue().add(JOB_NAMES.audioProcess, job, { ...AUDIO_JOB_OPTIONS, jobId: audioJobId(job) }));
  if (!sent) console.warn(`[queues] audio ticket for track ${job.trackId} not confirmed within ${SEND_LIMIT_MS} ms; the sweep will re-send it if needed`);
  return sent;
}

/** Close the queue and its Redis client (BullMQ leaves a client it was given open). */
export async function closeQueues(): Promise<void> {
  await queue?.close();
  client?.disconnect();
  queue = null;
  client = null;
}
