import { UnrecoverableError, type Job } from "bullmq";
import { parseAudioJob } from "@ferrel/queues";

/**
 * One uploaded file to process. Slice 4 only proves the ticket arrives; slices 5–7
 * add the length, preview and waveform (each checking the file is still the track's).
 */
export async function processAudio(job: Job): Promise<{ trackId: string }> {
  const ticket = parseAudioJob(job.data);
  // A malformed ticket will never succeed, so don't retry it.
  if (!ticket) throw new UnrecoverableError(`Malformed audio ticket ${job.id}`);
  console.log(`[audio] ticket received: track ${ticket.trackId}, file ${ticket.audioKey}`);
  return { trackId: ticket.trackId };
}
