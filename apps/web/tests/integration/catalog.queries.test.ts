// Public catalog queries: what anyone can see, no private columns, filters and paging.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, tracks } from "@ferrel/db";
import { EXPLORE_PAGE_SIZE } from "@/features/catalog/params";
import { creatorReleases, explorePage, getPublicCreator, getPublicTrack, latestReleases } from "@/features/catalog/queries";
import { ago, createUsers, removeCreatedUsers, type TestUser } from "./support";

let A: TestUser, B: TestUser, C: TestUser;
const live = (creatorId: string, slug: string, minutesAgo: number, extra: object = {}) => ({
  creatorId, title: slug, slug, genre: "pop" as const, basePriceCents: 500,
  status: "published" as const, publishedAt: ago(minutesAgo), audioKey: `${creatorId}/x/${slug}.wav`, audioSizeBytes: 10, audioFormat: "wav" as const, audioStatus: "processing" as const, ...extra,
});

beforeAll(async () => {
  [A, B, C] = await createUsers(["pa", "pb", "pc"]);
  await db.insert(tracks).values([
    { creatorId: A.id, title: "a-draft", slug: "a-draft", genre: "pop", basePriceCents: 500 },
    live(A.id, "a-live", 2, { genre: "lo-fi" }),
    live(A.id, "a-gone", 3, { status: "archived" }),
    live(B.id, "b-live", 1),
  ]);
});
afterAll(removeCreatedUsers);

describe("lists", () => {
  it("show published releases from every creator, newest first, never drafts or archived", async () => {
    const titles = (await latestReleases(50)).map((r) => r.title);
    expect(titles).toEqual(expect.arrayContaining(["a-live", "b-live"]));
    expect(titles).not.toContain("a-draft");
    expect(titles).not.toContain("a-gone");
    expect(titles.indexOf("b-live")).toBeLessThan(titles.indexOf("a-live"));
  });

  it("select display columns only: no audio location, owner id or the artist's rate", async () => {
    const [first] = await latestReleases(1);
    expect(Object.keys(first).sort()).toEqual(
      ["artistName", "bpm", "creatorSlug", "durationMs", "genre", "id", "musicalKey", "slug", "title"],
    );
  });

  it("filter by genre", async () => {
    const lofi = await explorePage({ genre: "lo-fi", page: 1 });
    expect(lofi.rows.map((r) => r.title)).toContain("a-live");
    expect(lofi.rows.every((r) => r.genre === "lo-fi")).toBe(true);
  });

  it(`page ${EXPLORE_PAGE_SIZE} at a time without overlap, and an out-of-range page is just empty`, async () => {
    const extra = EXPLORE_PAGE_SIZE + 6;
    await db.insert(tracks).values(Array.from({ length: extra }, (_, i) => live(C.id, `c-${String(i).padStart(2, "0")}`, 0.5 - i * 0.001)));
    const p1 = await explorePage({ genre: null, page: 1 });
    const p2 = await explorePage({ genre: null, page: 2 });
    expect(p1.rows).toHaveLength(EXPLORE_PAGE_SIZE);
    expect(p2.rows.length).toBeGreaterThanOrEqual(6);
    expect(p2.rows.some((r) => p1.rows.some((q) => q.id === r.id))).toBe(false);
    expect(p1.total).toBeGreaterThanOrEqual(extra + 2);
    const far = await explorePage({ genre: null, page: 9999 });
    expect(far).toEqual({ rows: [], total: p1.total });
  });

  it("creator pages list only that creator's published releases", async () => {
    expect((await creatorReleases(A.id)).map((r) => r.title)).toEqual(["a-live"]);
  });
});

describe("single pages", () => {
  it("open published and archived releases, but never drafts", async () => {
    expect((await getPublicTrack(A.slug!, "a-live"))?.status).toBe("published");
    expect((await getPublicTrack(A.slug!, "a-gone"))?.status).toBe("archived");
    expect(await getPublicTrack(A.slug!, "a-draft")).toBeNull();
  });

  it("don't mix creators: B's slug with A's track finds nothing", async () => {
    expect(await getPublicTrack(B.slug!, "a-live")).toBeNull();
  });

  it("never include the audio location", async () => {
    const page = await getPublicTrack(A.slug!, "a-live");
    expect(page).not.toHaveProperty("audioKey");
    expect(page).not.toHaveProperty("audioSizeBytes");
  });

  it("find creators by slug, and nothing for unknown slugs", async () => {
    expect((await getPublicCreator(A.slug!))?.artistName).toBe("Int pa");
    expect(await getPublicCreator("nobody-at-all-here")).toBeNull();
  });
});
