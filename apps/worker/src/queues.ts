import { Queue } from "bullmq";
import { createConnection, QUEUE_NAMES, queuePrefix } from "@ferrel/queues";

// Queue names, ticket formats and connection settings live in @ferrel/queues,
// shared with the web app. Workers wait on Redis, so they use the "worker" client.
export const connection = createConnection("worker");
export const prefix = queuePrefix();

export const systemQueue = new Queue(QUEUE_NAMES.system, { connection, prefix });
