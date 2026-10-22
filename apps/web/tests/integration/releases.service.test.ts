// Forged requests against the release service, following one release through its lifecycle.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, tracks } from "@ferrel/db";
import { createUploadUrl, getObjectInfo, newMasterKey } from "@ferrel/storage";
import { changeReleaseStatus, createRelease, updateRelease } from "@/features/releases/service";
import type { ReleaseFormValues } from "@/features/releases/types";
import { createUsers, removeUsers, type TestUser } from "./support";

const form = (patch: Partial<ReleaseFormValues> = {}): ReleaseFormValues => ({
  title: "Midnight Run", slug: "", description: "", genre: "electronic", bpm: "", musicalKey: "", totalSupply: "100", price: "12.50", ...patch,
});
const row = async (id: string) => (await db.select().from(tracks).where(eq(tracks.id, id)))[0];
const failure = (r: { ok: boolean; errors?: object; error?: string }) => (r.ok ? "ok" : JSON.stringify(r.errors ?? r.error));

/** A real (tiny) object in storage, so deletion can be checked. */
async function attachAudio(creatorId: string, trackId: string) {
  const key = newMasterKey(creatorId, trackId, "wav");
  const url = await createUploadUrl({ bucket: "masters", key, contentType: "audio/wav", contentLength: 12 });
  await fetch(url, { method: "PUT", body: "RIFF0000WAVE", headers: { "content-type": "audio/wav" } });
  await db.update(tracks).set({ audioKey: key, audioSizeBytes: 12, audioFormat: "wav" }).where(eq(tracks.id, trackId));
  return key;
}

let A: TestUser, B: TestUser;
let id = "", secondId = "";
let firstPublishedAt: Date | null = null;

beforeAll(async () => {
  [A, B] = await createUsers(["rela", "relb"]);
});
afterAll(() => removeUsers([A.id, B.id]));

describe("create", () => {
  it("stores a valid draft with a slug from the title and the price in cents", async () => {
    const r = await createRelease(A.id, form());
    expect(r.ok).toBe(true);
    id = r.ok ? r.id : "";
    expect(await row(id)).toMatchObject({ status: "draft", slug: "midnight-run", basePriceCents: 1250, copiesSold: 0 });
  });

  it("numbers a repeated title (midnight-run-2)", async () => {
    const r = await createRelease(A.id, form());
    secondId = r.ok ? r.id : "";
    expect((await row(secondId)).slug).toBe("midnight-run-2");
  });

  it("lets another creator use the same URL", async () => {
    const r = await createRelease(B.id, form());
    expect(r.ok && (await row(r.id)).slug).toBe("midnight-run");
  });

  it("refuses forged values in every field at once", async () => {
    const r = await createRelease(A.id, form({ price: "0", totalSupply: "5000", genre: "polka", bpm: "9999", musicalKey: "Z" }));
    expect(r.ok ? {} : Object.keys(r.errors)).toEqual(expect.arrayContaining(["price", "totalSupply", "genre", "bpm", "musicalKey"]));
  });

  it.each(["../../admin", "x%"])("refuses the slug %j", async (slug) => {
    expect((await createRelease(A.id, form({ slug }))).ok).toBe(false);
  });
});

describe("update", () => {
  it("answers 'not found' to another creator and to a malformed id", async () => {
    expect(failure(await updateRelease(B.id, id, form({ title: "Hacked" })))).toContain("Track not found");
    expect(failure(await updateRelease(A.id, "1 or 1=1", form()))).toContain("Track not found");
  });

  it("lets the owner edit a draft, including its URL", async () => {
    const r = await updateRelease(A.id, id, form({ title: "Midnight Run (Extended)", slug: "midnight-run-extended", bpm: "124", musicalKey: "Am", price: "15" }));
    expect(r.ok).toBe(true);
    expect(await row(id)).toMatchObject({ slug: "midnight-run-extended", bpm: 124, basePriceCents: 1500 });
  });

  it("refuses a URL the creator already uses", async () => {
    const r = await updateRelease(A.id, id, form({ slug: "midnight-run-2" }));
    expect(r.ok ? undefined : r.errors.slug).toBe("You already have a release at this URL.");
  });
});

describe("publish, unpublish, lock", () => {
  it("refuses to publish without audio, and to other creators", async () => {
    expect(failure(await changeReleaseStatus(A.id, id, "publish"))).toContain("Upload the audio file");
    expect(failure(await changeReleaseStatus(B.id, id, "publish"))).toContain("Track not found");
  });

  it("publishes once audio is attached", async () => {
    await attachAudio(A.id, id);
    expect((await changeReleaseStatus(A.id, id, "publish")).ok).toBe(true);
    const r = await row(id);
    expect(r.status).toBe("published");
    expect(r.publishedAt).not.toBeNull();
    firstPublishedAt = r.publishedAt;
  });

  it("refuses to delete a published release", async () => {
    expect(failure(await changeReleaseStatus(A.id, id, "delete"))).toContain("Only drafts");
  });

  it("ignores a forged URL change after publishing but keeps other edits", async () => {
    await updateRelease(A.id, id, form({ title: "Renamed", slug: "sneaky-new-url", price: "15" }));
    expect(await row(id)).toMatchObject({ slug: "midnight-run-extended", title: "Renamed" });
  });

  it("unpublishes to draft with the URL still locked", async () => {
    expect((await changeReleaseStatus(A.id, id, "unpublish")).ok).toBe(true);
    await updateRelease(A.id, id, form({ title: "Renamed", slug: "after-unpublish" }));
    expect(await row(id)).toMatchObject({ status: "draft", slug: "midnight-run-extended" });
  });

  it("keeps the first publish time when re-publishing", async () => {
    await changeReleaseStatus(A.id, id, "publish");
    expect((await row(id)).publishedAt?.getTime()).toBe(firstPublishedAt?.getTime());
  });
});

describe("after a sale (simulated)", () => {
  it("ignores forged changes to price and copies", async () => {
    await db.update(tracks).set({ copiesSold: 2 }).where(eq(tracks.id, id));
    const before = await row(id);
    expect((await updateRelease(A.id, id, form({ title: "Renamed", price: "499", totalSupply: "2" }))).ok).toBe(true);
    expect(await row(id)).toMatchObject({ basePriceCents: before.basePriceCents, totalSupply: 100 });
  });

  it("refuses to unpublish", async () => {
    expect(failure(await changeReleaseStatus(A.id, id, "unpublish"))).toContain("can only be archived");
  });
});

describe("archive and delete", () => {
  it("archives, then refuses edits and re-publishing, keeping the audio", async () => {
    const key = (await row(id)).audioKey!;
    expect((await changeReleaseStatus(A.id, id, "archive")).ok).toBe(true);
    expect((await row(id)).status).toBe("archived");
    expect(failure(await updateRelease(A.id, id, form({ title: "Back" })))).toContain("can't be edited");
    expect((await changeReleaseStatus(A.id, id, "publish")).ok).toBe(false);
    expect(await getObjectInfo("masters", key)).not.toBeNull();
  });

  it("deletes the owner's draft and its audio, but not for other creators", async () => {
    const key = await attachAudio(A.id, secondId);
    expect(failure(await changeReleaseStatus(B.id, secondId, "delete"))).toContain("Track not found");
    expect((await changeReleaseStatus(A.id, secondId, "delete")).ok).toBe(true);
    expect(await row(secondId)).toBeUndefined();
    expect(await getObjectInfo("masters", key)).toBeNull();
  });

  it("refuses an unknown action", async () => {
    expect(failure(await changeReleaseStatus(A.id, id, "destroy" as never))).toContain("Unknown action");
  });
});
