// The daily clean-up (phase 4 slice 12): storage files no track points to are deleted once old
// enough; everything else stays. Scoped to this test's own folders, so other data is untouched.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, tracks } from "@ferrel/db";
import { createUploadUrl, deleteObject, getObjectInfo, newMasterKey, newPreviewKey, type BucketName } from "@ferrel/storage";
import { cleanUpStorage } from "../../src/cleanup/clean-up-storage";
import { createCreator, removeCreated } from "./support";

let creator: string;
let trackId: string;
const made: [BucketName, string][] = []; // every file this test creates, deleted at the end

async function put(bucket: BucketName, key: string) {
  const body = bucket === "masters" ? "RIFF0000WAVE" : "ID3";
  const contentType = bucket === "masters" ? "audio/wav" : "audio/mpeg";
  const url = await createUploadUrl({ bucket, key, contentType, contentLength: body.length });
  const res = await fetch(url, { method: "PUT", body, headers: { "content-type": contentType } });
  if (res.status !== 200) throw new Error(`upload failed: ${res.status}`);
  made.push([bucket, key]);
}
const exists = async (bucket: BucketName, key: string) => (await getObjectInfo(bucket, key)) !== null;

beforeAll(async () => {
  creator = await createCreator("cleanup");
  [{ id: trackId }] = await db
    .insert(tracks)
    .values({ creatorId: creator, title: "Clean", slug: "clean", genre: "pop", baseRateMicros: 5_000_000 })
    .returning({ id: tracks.id });
});
afterAll(async () => {
  await Promise.all(made.map(([bucket, key]) => deleteObject(bucket, key)));
  await removeCreated();
});

describe("cleanUpStorage", () => {
  it("deletes unreferenced masters and previews, keeps the ones a track points to", async () => {
    const usedMaster = newMasterKey(creator, trackId, "wav");
    const abandonedMaster = newMasterKey(creator, trackId, "wav"); // uploaded, never confirmed
    const usedPreview = newPreviewKey(trackId);
    const orphanPreview = newPreviewKey(trackId); // e.g. left by a crash
    for (const [bucket, key] of [["masters", usedMaster], ["masters", abandonedMaster], ["previews", usedPreview], ["previews", orphanPreview]] as const) {
      await put(bucket, key);
    }
    await db
      .update(tracks)
      .set({ audioKey: usedMaster, audioSizeBytes: 12, audioFormat: "wav", audioStatus: "ready", durationMs: 1_000, previewKey: usedPreview })
      .where(eq(tracks.id, trackId));

    const removed = await cleanUpStorage({ olderThanMs: { masters: 0, previews: 0 }, prefixes: { masters: `${creator}/`, previews: `${trackId}/` } });

    expect(removed).toEqual({ masters: 1, previews: 1 });
    expect(await exists("masters", usedMaster)).toBe(true);
    expect(await exists("masters", abandonedMaster)).toBe(false);
    expect(await exists("previews", usedPreview)).toBe(true);
    expect(await exists("previews", orphanPreview)).toBe(false);
  });

  it("leaves files younger than the limit (an upload may still be confirmed)", async () => {
    const fresh = newMasterKey(creator, trackId, "wav");
    await put("masters", fresh);
    const removed = await cleanUpStorage({ olderThanMs: { masters: 60 * 60_000, previews: 60 * 60_000 }, prefixes: { masters: `${creator}/`, previews: `${trackId}/` } });
    expect(removed).toEqual({ masters: 0, previews: 0 });
    expect(await exists("masters", fresh)).toBe(true);
  });

  it("never deletes files named in a format we don't recognise", async () => {
    const odd = `${trackId}/notes-${randomUUID()}.txt`;
    await put("previews", odd);
    await cleanUpStorage({ olderThanMs: { masters: 0, previews: 0 }, prefixes: { masters: `${creator}/`, previews: `${trackId}/` } });
    expect(await exists("previews", odd)).toBe(true);
  });
});
