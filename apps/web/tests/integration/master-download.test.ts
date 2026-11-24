// Downloading the licensed master (phase 5 part 2, step A), with forged input.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, licenses, tracks } from "@ferrel/db";
import { createUploadUrl, newMasterKey } from "@ferrel/storage";
import { masterDownload } from "@/features/licensing/master-download";
import { createUsers, leadSplit, removeCreatedUsers, type TestUser } from "./support";

let artist: TestUser, licensee: TestUser, stranger: TestUser;
let trackId = "";
let activeId = "";
let endedId = "";
let splitVersionId = "";
const DAY = 86_400_000;
const WAV = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE"), Buffer.alloc(32)]);

async function license(startsAt: Date) {
  const [row] = await db
    .insert(licenses)
    .values({
      trackId,
      licenseeId: licensee.id,
      platforms: ["tiktok"],
      cities: ["london"],
      termDays: 30,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * DAY),
      rateMicros: 500_000,
      quote: {},
      termsVersion: "2026-11-13",
      splitVersionId,
    })
    .returning({ id: licenses.id });
  return row.id;
}

beforeAll(async () => {
  [artist, licensee, stranger] = await createUsers(["dlartist", "dllicensee", "dlstranger"]);
  [{ id: trackId }] = await db
    .insert(tracks)
    .values({ creatorId: artist.id, title: "Midnight Run", slug: "midnight-run", genre: "pop" })
    .returning({ id: tracks.id });
  const key = newMasterKey(artist.id, trackId, "wav");
  const url = await createUploadUrl({ bucket: "masters", key, contentType: "audio/wav", contentLength: WAV.length });
  await fetch(url, { method: "PUT", body: new Uint8Array(WAV), headers: { "content-type": "audio/wav" } });
  await db.update(tracks).set({ audioKey: key, audioSizeBytes: WAV.length, audioFormat: "wav", audioStatus: "ready", durationMs: 1_000, status: "published", publishedAt: new Date() }).where(eq(tracks.id, trackId));
  splitVersionId = await leadSplit(trackId, artist.id);
  activeId = await license(new Date());
  endedId = await license(new Date("2020-01-01T00:00:00Z"));
});
afterAll(removeCreatedUsers);

describe("masterDownload", () => {
  it("gives the licensee a short-lived private link that downloads the master as a named file", async () => {
    const r = await masterDownload(licensee.id, activeId);
    if (!r.ok) throw new Error(r.error);
    expect(r.url).toContain("X-Amz-Expires=300");
    expect(r.url).not.toContain(licensee.id);
    const res = await fetch(r.url);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(WAV);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="midnight-run\.wav"/);
  });

  it.each([
    ["someone else", () => stranger.id, () => activeId],
    ["the artist (the license isn't theirs)", () => artist.id, () => activeId],
    ["an ended license", () => licensee.id, () => endedId],
    ["a malformed id", () => licensee.id, () => "1 or 1=1"],
    ["a license that doesn't exist", () => licensee.id, () => "00000000-0000-4000-8000-000000000000"],
  ])("gives nothing to %s", async (_, user, id) => {
    expect((await masterDownload(user(), id())).ok).toBe(false);
  });

  it("gives nothing while the track's audio has failed", async () => {
    await db.update(tracks).set({ audioStatus: "failed", audioError: "This file has no audio in it.", durationMs: null }).where(eq(tracks.id, trackId));
    expect((await masterDownload(licensee.id, activeId)).ok).toBe(false);
    await db.update(tracks).set({ audioStatus: "ready", audioError: null, durationMs: 1_000 }).where(eq(tracks.id, trackId));
  });
});
