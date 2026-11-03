// Choosing the preview's start and switching previews on/off (phase 4 slice 9), with forged input.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, tracks } from "@ferrel/db";
import { closeQueues, getAudioQueue } from "@ferrel/queues";
import { createUploadUrl, getObjectInfo, newMasterKey, newPreviewKey } from "@ferrel/storage";
import { setPreviewEnabled, setPreviewStart } from "@/features/preview-settings/service";
import { createUsers, removeCreatedUsers, type TestUser } from "./support";

let A: TestUser, B: TestUser;
let trackId: string;

beforeAll(async () => {
  [A, B] = await createUsers(["previewa", "previewb"]);
  [{ id: trackId }] = await db
    .insert(tracks)
    .values({ creatorId: A.id, title: "Preview", slug: "preview", genre: "pop", basePriceCents: 500 })
    .returning({ id: tracks.id });
  await getAudioQueue().drain(true);
});
afterAll(async () => {
  await getAudioQueue().drain(true);
  await closeQueues();
  await removeCreatedUsers();
});

const set = (patch: Partial<typeof tracks.$inferInsert>) => db.update(tracks).set(patch).where(eq(tracks.id, trackId));
const row = async () => (await db.select().from(tracks).where(eq(tracks.id, trackId)))[0];
const error = (r: { ok: boolean; error?: string }) => (r.ok ? "ok" : r.error);
async function tickets() {
  const jobs = await getAudioQueue().getJobs(["waiting", "delayed", "prioritized"]);
  return jobs.filter((j) => j?.data?.trackId === trackId);
}

/** A ready track with a real preview file in the public bucket. */
async function readyWithPreview() {
  const previewKey = newPreviewKey(trackId);
  const url = await createUploadUrl({ bucket: "previews", key: previewKey, contentType: "audio/mpeg", contentLength: 3 });
  await fetch(url, { method: "PUT", body: "ID3", headers: { "content-type": "audio/mpeg" } });
  await set({
    audioKey: newMasterKey(A.id, trackId, "wav"), audioSizeBytes: 10, audioFormat: "wav",
    audioStatus: "ready", durationMs: 222_000, previewKey, previewEnabled: true, previewStartMs: null, previewFailedAt: null,
  });
  await getAudioQueue().drain(true);
  return previewKey;
}

describe("setPreviewStart", () => {
  it("saves the start, deletes the old preview and asks the worker for a new one", async () => {
    const old = await readyWithPreview();
    expect(error(await setPreviewStart(A.id, trackId, 55_000))).toBe("ok");
    const r = await row();
    expect([r.previewStartMs, r.previewKey]).toEqual([55_000, null]);
    expect(await getObjectInfo("previews", old)).toBeNull();
    expect(await tickets()).toHaveLength(1);
  });

  it("refuses other creators and malformed ids, changing nothing", async () => {
    const old = await readyWithPreview();
    expect(error(await setPreviewStart(B.id, trackId, 10_000))).toBe("Track not found.");
    expect(error(await setPreviewStart(A.id, "not-a-uuid", 10_000))).toBe("Track not found.");
    expect((await row()).previewKey).toBe(old);
  });

  it.each([
    ["past the latest start", 207_001],
    ["negative", -5],
    ["a fraction", 1.5],
  ])("refuses a start %s", async (_, startMs) => {
    await readyWithPreview();
    expect(error(await setPreviewStart(A.id, trackId, startMs))).toMatch(/start/i);
    expect((await row()).previewStartMs).toBeNull();
  });

  it("waits until the song is measured", async () => {
    await readyWithPreview();
    await set({ audioStatus: "processing", durationMs: null, previewKey: null });
    expect(error(await setPreviewStart(A.id, trackId, 10_000))).toContain("measured");
  });

  it("is refused for archived releases (read-only)", async () => {
    await readyWithPreview();
    await set({ status: "archived", publishedAt: new Date() });
    expect(error(await setPreviewStart(A.id, trackId, 10_000))).toContain("Archived");
    await set({ status: "draft" });
  });

  it("works for a published release (the master doesn't change)", async () => {
    await readyWithPreview();
    await set({ status: "published", publishedAt: new Date() });
    expect(error(await setPreviewStart(A.id, trackId, 10_000))).toBe("ok");
    await set({ status: "draft" });
  });
});

describe("setPreviewEnabled", () => {
  it("off: deletes the public preview at once, and sends no ticket", async () => {
    const old = await readyWithPreview();
    expect(error(await setPreviewEnabled(A.id, trackId, false))).toBe("ok");
    const r = await row();
    expect([r.previewEnabled, r.previewKey]).toEqual([false, null]);
    expect(await getObjectInfo("previews", old)).toBeNull();
    expect(await tickets()).toHaveLength(0);
  });

  it("on: asks the worker for a preview (and forgets an earlier give-up)", async () => {
    await set({ previewFailedAt: new Date() });
    expect(error(await setPreviewEnabled(A.id, trackId, true))).toBe("ok");
    const r = await row();
    expect([r.previewEnabled, r.previewFailedAt]).toEqual([true, null]);
    expect(await tickets()).toHaveLength(1);
  });

  it("refuses other creators, and archived releases", async () => {
    expect(error(await setPreviewEnabled(B.id, trackId, false))).toBe("Track not found.");
    await set({ status: "archived", publishedAt: new Date() });
    expect(error(await setPreviewEnabled(A.id, trackId, false))).toContain("Archived");
    await set({ status: "draft" });
  });
});
