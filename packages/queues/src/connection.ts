import { Redis } from "ioredis";

const url = () => process.env.REDIS_URL ?? "redis://localhost:6379";

/** Key prefix in Redis; integration tests use their own so a dev worker can't take their tickets. */
export const queuePrefix = () => process.env.QUEUE_PREFIX ?? "ferrel";

/**
 * A Redis client for BullMQ (version 6 needs an explicit client under ESM).
 * - "worker": waits on Redis indefinitely, as BullMQ workers require.
 * - "producer": a command gives up after one retry, so a web request never waits on a dead Redis.
 */
export function createConnection(kind: "worker" | "producer"): Redis {
  return new Redis(url(), { maxRetriesPerRequest: kind === "worker" ? null : 1 });
}
