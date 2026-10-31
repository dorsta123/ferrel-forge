// The worker measures an uploaded song (phase 4 slice 5): real FFmpeg, real storage, real database.
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, tracks } from "@ferrel/db";
import { runFfmpeg } from "@ferrel/audio";
import { AUDIO_FAILURE } from "../../src/audio/failure";
import { measureTrack } from "../../src/audio/measure-track";
import { createCreator, removeCreated, trackRow, trackWithMaster } from "./support";

const files = mkdtempSync(join(tmpdir(), "ferrel worker test "));
const work = mkdtempSync(join(tmpdir(), "ferrel worker temp ")); // the worker's temp folder in these tests
let creator: string;

beforeAll(async () => {
  creator = await createCreator("measure");
  await runFfmpeg(["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=10", "-ac", "1", join(files, "tone 10s.wav")]);
  writeFileSync(join(files, "fake.wav"), "plain text pretending to be a wav file");
});
afterAll(async () => {
  await removeCreated();
  rmSync(files, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
});

describe("measureTrack", () => {
  it("saves the exact length, the waveform and 'ready'", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    expect(await measureTrack(ticket, { lastAttempt: false, tempDir: work })).toBe("ready");

    const row = await trackRow(ticket.trackId);
    expect(row.status).toBe("ready");
    expect(row.error).toBeNull();
    expect(Math.abs(row.durationMs! - 10_000)).toBeLessThanOrEqual(50);
    expect(row.waveform).toHaveLength(200);
    expect(Math.max(...row.waveform!)).toBeGreaterThan(100); // a tone, not silence
    expect(readdirSync(work)).toEqual([]); // the temporary copy is gone
  });

  it("marks a file that isn't audio 'failed' with a reason the artist can act on", async () => {
    const ticket = await trackWithMaster(creator, join(files, "fake.wav"), "wav");
    expect(await measureTrack(ticket, { lastAttempt: false, tempDir: work })).toBe("failed");

    const row = await trackRow(ticket.trackId);
    expect(row).toMatchObject({ status: "failed", error: AUDIO_FAILURE.unreadable, durationMs: null, waveform: null });
    expect(readdirSync(work)).toEqual([]);
  });

  it("does nothing for an out-of-date ticket (the song was replaced)", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    const stale = { ...ticket, audioKey: ticket.audioKey.replace(/[0-9a-f]{8}(?=-[0-9a-f-]+\.wav$)/, "00000000") };
    expect(await measureTrack(stale, { lastAttempt: false, tempDir: work })).toBe("skipped");
    expect(await trackRow(ticket.trackId)).toMatchObject({ status: "processing", durationMs: null, waveform: null });
  });

  it("does nothing for a track that isn't 'processing' any more", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await db.update(tracks).set({ audioStatus: "failed", audioError: "Earlier failure." }).where(eq(tracks.id, ticket.trackId));
    expect(await measureTrack(ticket, { lastAttempt: false, tempDir: work })).toBe("skipped");
    expect((await trackRow(ticket.trackId)).status).toBe("failed");
  });

  it("retries a slow file (throws, still 'processing'), and fails it only on the last attempt", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await expect(measureTrack(ticket, { lastAttempt: false, tempDir: work, timeoutMs: 1 })).rejects.toThrow();
    expect((await trackRow(ticket.trackId)).status).toBe("processing");

    expect(await measureTrack(ticket, { lastAttempt: true, tempDir: work, timeoutMs: 1 })).toBe("failed");
    expect(await trackRow(ticket.trackId)).toMatchObject({ status: "failed", error: AUDIO_FAILURE.tooSlow });
    expect(readdirSync(work)).toEqual([]);
  });
});
