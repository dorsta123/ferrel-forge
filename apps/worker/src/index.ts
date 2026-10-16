import { Worker } from "bullmq";
import { connection, QUEUE_NAMES, systemQueue } from "./queues";

const worker = new Worker(
  QUEUE_NAMES.system,
  async (job) => {
    if (job.name === "ping") return { pong: new Date().toISOString() };
    throw new Error(`Unknown job: ${job.name}`);
  },
  { connection },
);

worker.on("completed", (job, result) => console.log(`[${job.name}] done`, result));
worker.on("failed", (job, err) => console.error(`[${job?.name}] failed`, err.message));

console.log("Worker started, listening on queue:", QUEUE_NAMES.system);
await systemQueue.add("ping", {});

const shutdown = async () => {
  await worker.close();
  await systemQueue.close();
  connection.disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
