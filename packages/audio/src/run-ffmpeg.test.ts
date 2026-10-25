import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyzeAudio } from "./analyze";
import { AudioToolError } from "./errors";
import { localInput, runFfmpeg } from "./run-ffmpeg";
import { generate, makeTempDir } from "./test-fixtures";

const tmp = makeTempDir();
beforeAll(async () => {
  await generate(tmp.file("one second.wav"), { seconds: 1 });
  await generate(tmp.file("secret.wav"), { seconds: 30 }); // stands in for another creator's master
});
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
    const err = await failure(runFfmpeg([...localInput(garbage, "wav"), "-f", "null", "-"]));
    expect(err?.code).toBe("FAILED");
    expect(err?.message).toMatch(/Invalid data|header|error/i);
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  it("treats shell characters in file names as plain text (no shell is involved)", async () => {
    const tricky = tmp.file("a; echo hacked & b.wav");
    await generate(tricky, { seconds: 1 });
    await runFfmpeg([...localInput(tricky, "wav"), "-f", "null", "-"]);
    expect(existsSync(tricky)).toBe(true);
    expect(readdirSync(tmp.dir).some((n) => /hacked/.test(n) && n !== "a; echo hacked & b.wav")).toBe(false);
  });

  it("refuses to read from the network, before trying to connect", async () => {
    const url = "http://127.0.0.1:9/track.wav";
    const blocked = await failure(runFfmpeg([...localInput(url, "wav"), "-f", "null", "-"]));
    expect(blocked?.code).toBe("FAILED");
    expect(blocked?.message).toMatch(/Invalid argument|whitelist/i);
    // Control: without localInput, FFmpeg really attempts the connection (and fails differently).
    const attempted = await failure(runFfmpeg(["-i", url, "-f", "null", "-"], { timeoutMs: 15_000 }));
    expect(attempted?.message).not.toMatch(/Invalid argument|whitelist/i);
  });

  it("can't be tricked into reading another local file (playlist/concat disguised as audio)", async () => {
    const evil = tmp.file("evil.wav");
    writeFileSync(evil, "ffconcat version 1.0\nfile secret.wav\n");
    // Control: if FFmpeg is left to guess the format, the trick works and it decodes secret.wav.
    const guessed = await runFfmpeg(["-protocol_whitelist", "file", "-i", evil, "-f", "null", "-"]).then(() => "read secret.wav", () => "refused");
    expect(guessed).toBe("read secret.wav");
    // With the declared format, it's refused.
    expect((await failure(runFfmpeg([...localInput(evil, "wav"), "-f", "null", "-"])))?.code).toBe("FAILED");
    await expect(analyzeAudio(evil, "wav")).rejects.toBeInstanceOf(AudioToolError);
  });

  it("streams output to a callback instead of buffering it", async () => {
    let bytes = 0;
    const result = await runFfmpeg([...localInput(tmp.file("one second.wav"), "wav"), "-ac", "1", "-ar", "8000", "-f", "s16le", "pipe:1"], {
      onStdout: (c) => (bytes += c.length),
    });
    expect(bytes).toBe(16_000); // 1 s × 8000 samples × 2 bytes
    expect(result.stdout.length).toBe(0);
  });

  it("stops FFmpeg and reports clearly if the output handler throws", async () => {
    const err = await failure(
      runFfmpeg([...localInput(tmp.file("secret.wav"), "wav"), "-f", "s16le", "pipe:1"], {
        onStdout: () => {
          throw new Error("boom");
        },
      }),
    );
    expect(err?.code).toBe("FAILED");
    expect(err?.message).toContain("boom");
  });
});
