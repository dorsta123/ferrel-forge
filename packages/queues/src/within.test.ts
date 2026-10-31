import { describe, expect, it } from "vitest";
import { within } from "./within";

describe("within", () => {
  it("answers true when the work finishes in time", async () => {
    expect(await within(100, Promise.resolve("ok"))).toBe(true);
  });

  it("answers false, never throws, when the work fails (e.g. Redis refused)", async () => {
    expect(await within(100, Promise.reject(new Error("ECONNREFUSED")))).toBe(false);
  });

  it("answers false on time when the work hangs (e.g. Redis unreachable)", async () => {
    const started = Date.now();
    expect(await within(100, new Promise(() => {}))).toBe(false);
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});
