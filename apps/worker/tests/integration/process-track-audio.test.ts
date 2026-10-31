// The worker processes an uploaded song: measures it (slice 5), then makes its preview
// (slice 6). Real FFmpeg, real storage, real database.
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyzeAudio, runFfmpeg } from "@ferrel/audio";
import { db, eq, tracks } from "@ferrel/db";
import { deleteObject, getObjectInfo, newPreviewKey, uploadFile } from "@ferrel/storage";
import { AUDIO_FAILURE } from "../../src/audio/failure";
import { processTrackAudio } from "../../src/audio/process-track-audio";
import { savePreviewOrDiscard } from "../../src/audio/preview-step";
import { createCreator, publicUrl, removeCreated, trackRow, trackWithMaster } from "./support";

const files = mkdtempSync(join(tmpdir(), "ferrel worker test "));
const work = mkdtempSync(join(tmpdir(), "ferrel worker temp ")); // the worker's temp folder in these tests
const opts = { lastAttempt: false, tempDir: work };
let creator: string;

beforeAll(async () => {
  creator = await createCreator("measure");
  await runFfmpeg(["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=10", "-ac", "1", join(files, "tone 10s.wav")]);
  await runFfmpeg(["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=40", "-ac", "1", join(files, "tone 40s.wav")]);
  writeFileSync(join(files, "fake.wav"), "plain text pretending to be a wav file");
  await runFfmpeg(["-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=0.0001", join(files, "blip.wav")]);
});
afterAll(async () => {
  await removeCreated();
  rmSync(files, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
});

/** Download a public preview without any credentials, as a visitor's browser would. */
async function downloadPublic(key: string) {
  const res = await fetch(publicUrl("previews", key));
  expect(res.status).toBe(200);
  const path = join(files, `${key.replace(/\//g, "_")}`);
  writeFileSync(path, new Uint8Array(await res.arrayBuffer()));
  return path;
}

describe("measuring", () => {
  it("saves the exact length, the waveform and 'ready'", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    expect((await processTrackAudio(ticket, opts)).measured).toBe("ready");

    const row = await trackRow(ticket.trackId);
    expect(row.status).toBe("ready");
    expect(row.error).toBeNull();
    expect(Math.abs(row.durationMs! - 10_000)).toBeLessThanOrEqual(50);
    expect(row.waveform).toHaveLength(200);
    expect(Math.max(...row.waveform!)).toBeGreaterThan(100); // a tone, not silence
    expect(readdirSync(work)).toEqual([]); // the temporary copy is gone
  });

  it("marks a file that isn't audio 'failed' with a reason the artist can act on, and makes no preview", async () => {
    const ticket = await trackWithMaster(creator, join(files, "fake.wav"), "wav");
    expect(await processTrackAudio(ticket, opts)).toEqual({ measured: "failed", preview: "skipped" });
    expect(await trackRow(ticket.trackId)).toMatchObject({ status: "failed", error: AUDIO_FAILURE.unreadable, durationMs: null, waveform: null, previewKey: null });
    expect(readdirSync(work)).toEqual([]);
  });

  it("marks a file under a millisecond long 'failed' at once, instead of retrying forever", async () => {
    const ticket = await trackWithMaster(creator, join(files, "blip.wav"), "wav");
    expect((await processTrackAudio(ticket, opts)).measured).toBe("failed");
    expect(await trackRow(ticket.trackId)).toMatchObject({ status: "failed", error: AUDIO_FAILURE.noAudio });
  });

  it("marks a track 'failed' when its master is missing from storage", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await deleteObject("masters", ticket.audioKey);
    expect((await processTrackAudio(ticket, opts)).measured).toBe("failed");
    expect(await trackRow(ticket.trackId)).toMatchObject({ status: "failed", error: AUDIO_FAILURE.missing });
    expect(readdirSync(work)).toEqual([]);
  });

  it("does nothing for an out-of-date ticket (the song was replaced)", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    const stale = { ...ticket, audioKey: ticket.audioKey.replace(/[0-9a-f]{8}(?=-[0-9a-f-]+\.wav$)/, "00000000") };
    expect(await processTrackAudio(stale, opts)).toEqual({ measured: "skipped", preview: "skipped" });
    expect(await trackRow(ticket.trackId)).toMatchObject({ status: "processing", durationMs: null, waveform: null, previewKey: null });
  });

  it("does nothing for a track that failed earlier", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await db.update(tracks).set({ audioStatus: "failed", audioError: "Earlier failure." }).where(eq(tracks.id, ticket.trackId));
    expect(await processTrackAudio(ticket, opts)).toEqual({ measured: "skipped", preview: "skipped" });
    expect((await trackRow(ticket.trackId)).status).toBe("failed");
  });

  it("retries a slow file (throws, still 'processing'), and fails it only on the last attempt", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await expect(processTrackAudio(ticket, { ...opts, timeoutMs: 1 })).rejects.toThrow();
    expect((await trackRow(ticket.trackId)).status).toBe("processing");

    expect((await processTrackAudio(ticket, { ...opts, lastAttempt: true, timeoutMs: 1 })).measured).toBe("failed");
    expect(await trackRow(ticket.trackId)).toMatchObject({ status: "failed", error: AUDIO_FAILURE.tooSlow });
    expect(readdirSync(work)).toEqual([]);
  });
});

describe("the preview", () => {
  it("is made right after measuring: 15 s, public, while the master stays private", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 40s.wav"), "wav");
    expect(await processTrackAudio(ticket, opts)).toEqual({ measured: "ready", preview: "made" });

    const row = await trackRow(ticket.trackId);
    expect(row.previewKey).toMatch(new RegExp(`^${ticket.trackId}/[0-9a-f-]{36}\\.mp3$`));
    const { durationMs } = await analyzeAudio(await downloadPublic(row.previewKey!), "mp3");
    expect(Math.abs(durationMs - 15_000)).toBeLessThanOrEqual(50);
    expect((await fetch(publicUrl("masters", ticket.audioKey))).status).toBe(403);
    expect(readdirSync(work)).toEqual([]);
  });

  it("uses the whole of a song shorter than 15 s", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await processTrackAudio(ticket, opts);
    const { durationMs } = await analyzeAudio(await downloadPublic((await trackRow(ticket.trackId)).previewKey!), "mp3");
    expect(Math.abs(durationMs - 10_000)).toBeLessThanOrEqual(50);
  });

  it("isn't made when the artist switched previews off", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await db.update(tracks).set({ previewEnabled: false }).where(eq(tracks.id, ticket.trackId));
    expect(await processTrackAudio(ticket, opts)).toEqual({ measured: "ready", preview: "skipped" });
    expect((await trackRow(ticket.trackId)).previewKey).toBeNull();
  });

  it("isn't made twice when the same ticket runs again (retry or sweep)", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await processTrackAudio(ticket, opts);
    const first = (await trackRow(ticket.trackId)).previewKey;
    expect(await processTrackAudio(ticket, opts)).toEqual({ measured: "skipped", preview: "skipped" });
    expect((await trackRow(ticket.trackId)).previewKey).toBe(first);
  });

  it("is made on a later run for a 'ready' track still missing one (e.g. the first try failed)", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await db.update(tracks).set({ audioStatus: "ready", durationMs: 10_000 }).where(eq(tracks.id, ticket.trackId));
    expect(await processTrackAudio(ticket, opts)).toEqual({ measured: "skipped", preview: "made" });
  });

  it("is retried when it fails, then recorded as failed on the last attempt and left alone", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await db.update(tracks).set({ audioStatus: "ready", durationMs: 10_000 }).where(eq(tracks.id, ticket.trackId));
    await expect(processTrackAudio(ticket, { ...opts, timeoutMs: 1 })).rejects.toThrow();
    expect((await trackRow(ticket.trackId)).previewFailedAt).toBeNull();

    expect(await processTrackAudio(ticket, { ...opts, lastAttempt: true, timeoutMs: 1 })).toEqual({ measured: "skipped", preview: "failed" });
    const row = await trackRow(ticket.trackId);
    expect(row).toMatchObject({ status: "ready", previewKey: null }); // the song itself stays ready
    expect(row.previewFailedAt).toBeInstanceOf(Date);
    expect(await processTrackAudio(ticket, opts)).toEqual({ measured: "skipped", preview: "skipped" }); // given up on
    expect(readdirSync(work)).toEqual([]);
  });

  it("is given up on the same way when a ready track's master has gone missing", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await db.update(tracks).set({ audioStatus: "ready", durationMs: 10_000 }).where(eq(tracks.id, ticket.trackId));
    await deleteObject("masters", ticket.audioKey);
    await expect(processTrackAudio(ticket, opts)).rejects.toThrow();
    expect((await processTrackAudio(ticket, { ...opts, lastAttempt: true })).preview).toBe("failed");
  });

  it("is deleted again if the track changed while it was being made (song replaced or previews off)", async () => {
    const ticket = await trackWithMaster(creator, join(files, "tone 10s.wav"), "wav");
    await db.update(tracks).set({ audioStatus: "ready", durationMs: 10_000, previewEnabled: false }).where(eq(tracks.id, ticket.trackId));
    const key = newPreviewKey(ticket.trackId);
    await uploadFile("previews", key, join(files, "tone 10s.wav"), "audio/mpeg");

    expect(await savePreviewOrDiscard(ticket, key)).toBe(false);
    expect(await getObjectInfo("previews", key)).toBeNull();
    expect((await trackRow(ticket.trackId)).previewKey).toBeNull();
  });
});
