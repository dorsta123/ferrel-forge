// User choice 1 (phase 4 slice 4): with Redis unreachable, sending a ticket gives up
// quickly and quietly, so the upload still succeeds and the sweep retries later.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  process.env.REDIS_URL = "redis://127.0.0.1:1"; // nothing listens on port 1
});

describe("queueAudioProcessing with Redis down", () => {
  let closeQueues: () => Promise<void>;
  afterAll(async () => closeQueues?.());

  it("answers false within about 2 seconds, without throwing", async () => {
    const queues = await import("./audio-queue");
    closeQueues = queues.closeQueues;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const started = Date.now();
    const sent = await queues.queueAudioProcessing({ trackId: "00000000-0000-4000-8000-000000000001", audioKey: "a/b/c.wav" });

    expect(sent).toBe(false);
    expect(Date.now() - started).toBeLessThan(3_000);
    expect(warn).toHaveBeenCalledOnce();
    // Reconnect errors are summarised, not printed as a stack trace every 2 seconds.
    expect(error.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
