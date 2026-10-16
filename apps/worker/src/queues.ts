import { Queue } from "bullmq";
import { Redis } from "ioredis";

// BullMQ 6 needs an explicit Redis client in ESM. Workers block on Redis,
// so maxRetriesPerRequest must be null.
export const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// One queue per kind of background work. Phase 4 adds "audio", phase 6 adds "pricing".
export const QUEUE_NAMES = { system: "system" } as const;

export const systemQueue = new Queue(QUEUE_NAMES.system, { connection });
