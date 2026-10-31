import { UnrecoverableError, type Job } from "bullmq";
import { parseAudioJob } from "@ferrel/queues";
import { processTrackAudio, type ProcessResult } from "./process-track-audio";

/** One uploaded file to process: measure it, then make its preview (slices 5–6). */
export async function processAudio(job: Job): Promise<{ trackId: string } & ProcessResult> {
  const ticket = parseAudioJob(job.data);
  // A malformed ticket will never succeed, so don't retry it.
  if (!ticket) throw new UnrecoverableError(`Malformed audio ticket ${job.id}`);
  const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
  return { trackId: ticket.trackId, ...(await processTrackAudio(ticket, { lastAttempt })) };
}
