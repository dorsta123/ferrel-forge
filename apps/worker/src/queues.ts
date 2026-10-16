import { Queue } from "bullmq";

export const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

// One queue per kind of background work. Phase 4 adds "audio", phase 6 adds "pricing".
export const QUEUE_NAMES = { system: "system" } as const;

export const systemQueue = new Queue(QUEUE_NAMES.system, { connection });
