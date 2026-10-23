// Dashboard queries: creators never see each other's releases; filters, counts, order and cap.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, tracks } from "@ferrel/db";
import { parseTrackFilter } from "@/features/creator-tracks/filters";
import { TRACK_LIST_LIMIT, creatorTrackStats, listCreatorTracks } from "@/features/creator-tracks/queries";
import { ago, createUsers, removeCreatedUsers, type TestUser } from "./support";

let A: TestUser, B: TestUser, C: TestUser;
const audio = (id: string, n: number) => ({ audioKey: `${id}/x/${n}.wav`, audioSizeBytes: 10, audioFormat: "wav" as const });
const t = (creatorId: string, slug: string, extra: object = {}) => ({ creatorId, title: slug, slug, genre: "pop" as const, basePriceCents: 500, ...extra });

beforeAll(async () => {
  [A, B, C] = await createUsers(["qa", "qb", "qc"]);
  await db.insert(tracks).values([
    t(A.id, "a-draft", { updatedAt: ago(30) }),
    t(A.id, "a-live", { ...audio(A.id, 1), status: "published", publishedAt: ago(60), updatedAt: ago(10) }),
    t(A.id, "a-old", { ...audio(A.id, 2), status: "archived", publishedAt: ago(90), updatedAt: ago(50) }),
    t(B.id, "b-secret", { updatedAt: ago(1) }),
  ]);
});
afterAll(removeCreatedUsers);

describe("listCreatorTracks", () => {
  it("returns only the creator's releases, newest-edited first", async () => {
    expect((await listCreatorTracks(A.id, "all")).map((r) => r.title)).toEqual(["a-live", "a-draft", "a-old"]);
  });

  it("filters by status and knows which rows have audio", async () => {
    const drafts = await listCreatorTracks(A.id, "draft");
    expect(drafts.map((r) => [r.title, r.hasAudio])).toEqual([["a-draft", false]]);
    expect((await listCreatorTracks(A.id, "published"))[0]?.hasAudio).toBe(true);
  });

  it("turns a forged ?status= into 'all'", () => {
    expect(parseTrackFilter("draft' or 1=1 --")).toBe("all");
  });

  it(`caps the list at ${TRACK_LIST_LIMIT} while stats count everything`, async () => {
    await db.insert(tracks).values(Array.from({ length: TRACK_LIST_LIMIT + 5 }, (_, i) => t(C.id, `c-${i}`)));
    expect(await listCreatorTracks(C.id, "all")).toHaveLength(TRACK_LIST_LIMIT);
    expect((await creatorTrackStats(C.id)).all).toBe(TRACK_LIST_LIMIT + 5);
  });
});

describe("creatorTrackStats", () => {
  it("counts each status", async () => {
    expect(await creatorTrackStats(A.id)).toEqual({ all: 3, draft: 1, published: 1, archived: 1 });
  });

  it("counts only the creator's own releases", async () => {
    expect((await creatorTrackStats(B.id)).all).toBe(1);
  });

  it("returns zeros for a creator with nothing", async () => {
    expect(await creatorTrackStats("00000000-0000-4000-8000-000000000000")).toEqual({ all: 0, draft: 0, published: 0, archived: 0 });
  });
});
