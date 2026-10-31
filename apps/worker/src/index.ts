import { Worker } from "bullmq";
import { closeQueues, JOB_NAMES, QUEUE_NAMES } from "@ferrel/queues";
import { processAudio } from "./audio/process-audio";
import { connection, prefix, systemQueue } from "./queues";
import { handleSystemJob } from "./system/handle-system-job";

const SWEEP_EVERY_MS = 5 * 60_000;

const workers = [
  new Worker(QUEUE_NAMES.system, handleSystemJob, { connection, prefix }),
  new Worker(QUEUE_NAMES.audio, processAudio, { connection, prefix, concurrency: 2 }),
];
for (const worker of workers) {
  worker.on("completed", (job, result) => console.log(`[${job.name}] done`, result));
  worker.on("failed", (job, err) => console.error(`[${job?.name}] failed`, err.message));
}

console.log("Worker started, listening on queues:", Object.values(QUEUE_NAMES).join(", "));
// Re-send tickets for tracks stuck in "processing" (user choice, phase 4 slice 4).
await systemQueue.upsertJobScheduler(JOB_NAMES.requeueStuckAudio, { every: SWEEP_EVERY_MS }, { name: JOB_NAMES.requeueStuckAudio });
await systemQueue.add(JOB_NAMES.ping, {});

const shutdown = async () => {
  await Promise.all(workers.map((w) => w.close()));
  await systemQueue.close();
  await closeQueues();
  connection.disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
