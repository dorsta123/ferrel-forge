import { UnrecoverableError, type Job } from "bullmq";
import { parseAudioJob } from "@ferrel/queues";
import { measureTrack } from "./measure-track";

/** One uploaded file to process: today its length and waveform (slice 5); the preview comes in slice 6. */
export async function processAudio(job: Job): Promise<{ trackId: string; result: string }> {
  const ticket = parseAudioJob(job.data);
  // A malformed ticket will never succeed, so don't retry it.
  if (!ticket) throw new UnrecoverableError(`Malformed audio ticket ${job.id}`);
  const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
  const result = await measureTrack(ticket, { lastAttempt });
  return { trackId: ticket.trackId, result };
}
