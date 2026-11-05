import type { Job } from "bullmq";
import { JOB_NAMES, requeueStuckAudio } from "@ferrel/queues";
import { cleanUpStorage } from "../cleanup/clean-up-storage";

/** Housekeeping jobs: a start-up ping, the sweep for stuck audio, and the daily storage clean-up. */
export async function handleSystemJob(job: Job): Promise<unknown> {
  switch (job.name) {
    case JOB_NAMES.ping:
      return { pong: new Date().toISOString() };
    case JOB_NAMES.requeueStuckAudio:
      return { requeued: await requeueStuckAudio() };
    case JOB_NAMES.cleanUpStorage:
      return { deleted: await cleanUpStorage() };
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}
