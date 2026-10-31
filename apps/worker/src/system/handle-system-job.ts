import type { Job } from "bullmq";
import { JOB_NAMES, requeueStuckAudio } from "@ferrel/queues";

/** Housekeeping jobs: a start-up ping and the scheduled sweep for stuck audio. */
export async function handleSystemJob(job: Job): Promise<unknown> {
  switch (job.name) {
    case JOB_NAMES.ping:
      return { pong: new Date().toISOString() };
    case JOB_NAMES.requeueStuckAudio:
      return { requeued: await requeueStuckAudio() };
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}
