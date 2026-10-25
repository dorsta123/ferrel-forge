import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { AudioToolError } from "./errors";
import { localInput, runFfmpeg } from "./run-ffmpeg";
import { generate, makeTempDir } from "./test-fixtures";

const tmp = makeTempDir();
afterAll(() => tmp.cleanup());

const failure = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => (e instanceof AudioToolError ? e : null));

describe("runFfmpeg", () => {
  it("stops a process that runs past its time limit", async () => {
    const started = Date.now();
    // An endless tone: without the limit this would never finish.
    const err = await failure(runFfmpeg(["-f", "lavfi", "-i", "sine=frequency=440", "-f", "null", "-"], { timeoutMs: 500 }));
    expect(err?.code).toBe("TIMEOUT");
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("fails fast and clearly on a file that isn't audio", async () => {
    const garbage = tmp.file("garbage.wav");
    writeFileSync(garbage, Buffer.from(Array.from({ length: 20_000 }, (_, i) => (i * 7919) % 256)));
    const started = Date.now();
    const err = await failure(runFfmpeg([...localInput(garbage), "-f", "null", "-"]));
    expect(err?.code).toBe("FAILED");
    expect(err?.message).toMatch(/Invalid data/i);
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  it("treats shell characters in file names as plain text (no shell is involved)", async () => {
    const tricky = tmp.file("a; echo hacked & b.wav");
    await generate(tricky, { seconds: 1 });
    await runFfmpeg([...localInput(tricky), "-f", "null", "-"]);
    expect(existsSync(tricky)).toBe(true);
    expect(readdirSync(tmp.dir).some((n) => /hacked/.test(n) && n !== "a; echo hacked & b.wav")).toBe(false);
  });

  it("refuses to read from the network", async () => {
    const err = await failure(runFfmpeg([...localInput("http://127.0.0.1:9/track.wav"), "-f", "null", "-"]));
    expect(err?.code).toBe("FAILED");
    expect(err?.message).toMatch(/whitelist|protocol/i);
  });

  it("streams output to a callback instead of buffering it", async () => {
    const wav = tmp.file("one second.wav");
    await generate(wav, { seconds: 1 });
    let bytes = 0;
    const result = await runFfmpeg([...localInput(wav), "-ac", "1", "-ar", "8000", "-f", "s16le", "pipe:1"], { onStdout: (c) => (bytes += c.length) });
    expect(bytes).toBe(16_000); // 1 s × 8000 samples × 2 bytes
    expect(result.stdout.length).toBe(0);
  });
});
