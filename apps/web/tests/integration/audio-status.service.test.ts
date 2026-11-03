// The editor's audio status and "Try again" (phase 4 slice 8), with forged input.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, tracks } from "@ferrel/db";
import { AUDIO_FAILURE } from "@ferrel/db/constants";
import { closeQueues, getAudioQueue } from "@ferrel/queues";
import { newMasterKey } from "@ferrel/storage";
import { getAudioStatus, retryAudio } from "@/features/audio-status/service";
import { createUsers, removeCreatedUsers, type TestUser } from "./support";

let A: TestUser, B: TestUser;
let trackId: string;

beforeAll(async () => {
  [A, B] = await createUsers(["statusa", "statusb"]);
  [{ id: trackId }] = await db
    .insert(tracks)
    .values({ creatorId: A.id, title: "Status", slug: "status", genre: "pop", basePriceCents: 500 })
    .returning({ id: tracks.id });
  await getAudioQueue().drain(true);
});
afterAll(async () => {
  await getAudioQueue().drain(true);
  await closeQueues();
  await removeCreatedUsers();
});

const set = (patch: Partial<typeof tracks.$inferInsert>) => db.update(tracks).set(patch).where(eq(tracks.id, trackId));
const audio = () => ({ audioKey: newMasterKey(A.id, trackId, "wav"), audioSizeBytes: 10, audioFormat: "wav" as const });
const row = async () => (await db.select().from(tracks).where(eq(tracks.id, trackId)))[0];
async function tickets() {
  const jobs = await getAudioQueue().getJobs(["waiting", "delayed", "prioritized"]);
  return jobs.filter((j) => j?.data?.trackId === trackId).map((j) => j.data);
}
const error = (r: { ok: boolean; error?: string }) => (r.ok ? "ok" : r.error);

describe("getAudioStatus", () => {
  it("answers the owner with the track's current state", async () => {
    await set({ ...audio(), audioStatus: "ready", durationMs: 222_000, previewKey: `${trackId}/p.mp3` });
    expect(await getAudioStatus(A.id, trackId)).toEqual({
      status: "ready",
      error: null,
      durationMs: 222_000,
      previewEnabled: true,
      hasPreview: true,
      previewFailed: false,
      canRetry: false,
    });
  });

  it("answers 'not found' (null) for someone else's track or a malformed id, never revealing it", async () => {
    expect(await getAudioStatus(B.id, trackId)).toBeNull();
    expect(await getAudioStatus(A.id, "'; drop table tracks; --")).toBeNull();
  });
});

describe("retryAudio", () => {
  it("refuses other creators, and changes nothing", async () => {
    await set({ ...audio(), audioStatus: "failed", audioError: AUDIO_FAILURE.tooSlow, durationMs: null, previewKey: null });
    expect(error(await retryAudio(B.id, trackId))).toBe("Track not found.");
    expect((await row()).audioStatus).toBe("failed");
    expect(await tickets()).toEqual([]);
  });

  it("doesn't retry a file that can't succeed (the artist must upload a different one)", async () => {
    await set({ audioError: AUDIO_FAILURE.unreadable });
    expect((await getAudioStatus(A.id, trackId))?.canRetry).toBe(false);
    expect(error(await retryAudio(A.id, trackId))).toBe("Nothing to retry.");
    expect(await tickets()).toEqual([]);
    await set({ audioError: AUDIO_FAILURE.tooSlow });
    expect((await getAudioStatus(A.id, trackId))?.canRetry).toBe(true);
  });

  it("sends a failed file back to processing with exactly one ticket for its file", async () => {
    expect(error(await retryAudio(A.id, trackId))).toBe("ok");
    const r = await row();
    expect([r.audioStatus, r.audioError]).toEqual(["processing", null]);
    expect(await tickets()).toEqual([{ trackId, audioKey: r.audioKey }]);
  });

  it("has nothing to retry while processing (a double click sends no second ticket)", async () => {
    expect(error(await retryAudio(A.id, trackId))).toBe("Nothing to retry.");
    expect(await tickets()).toHaveLength(1);
  });

  it("retries a preview that couldn't be made, keeping the song ready", async () => {
    await getAudioQueue().drain(true);
    await set({ audioStatus: "ready", durationMs: 222_000, previewFailedAt: new Date() });
    expect(error(await retryAudio(A.id, trackId))).toBe("ok");
    const r = await row();
    expect([r.audioStatus, r.previewFailedAt]).toEqual(["ready", null]);
    expect(await tickets()).toHaveLength(1);
  });

  it("has nothing to retry when everything is fine, or there's no audio", async () => {
    await set({ previewKey: `${trackId}/p.mp3` });
    expect(error(await retryAudio(A.id, trackId))).toBe("Nothing to retry.");
    await set({ audioKey: null, audioSizeBytes: null, audioFormat: null, audioStatus: "none", durationMs: null, previewKey: null });
    expect(error(await retryAudio(A.id, trackId))).toBe("Nothing to retry.");
  });
});
