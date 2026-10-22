// The database as a backstop: invalid rows written directly (bypassing all app
// code) are refused by Postgres with the expected constraint.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creatorProfiles, db, eq, tracks, users } from "@ferrel/db";
import { createUsers, pgError, removeUsers, type TestUser } from "./support";

let A: TestUser, B: TestUser, buyer: TestUser;
type TrackRow = typeof tracks.$inferInsert;

const valid = (): TrackRow => ({ creatorId: A.id, title: "Valid", slug: "valid", genre: "pop", totalSupply: 10, basePriceCents: 500 });
// Built when the test table is collected (before users exist), so no user ids here.
const audio = () => ({ audioKey: "db-rules/t/x.wav", audioSizeBytes: 100, audioFormat: "wav" as const });
const insert = (patch: Record<string, unknown>) =>
  db.insert(tracks).values({ ...valid(), slug: `s-${randomUUID().slice(0, 8)}`, ...patch } as TrackRow);

/** The write must fail, naming this constraint (or Postgres error code). */
async function expectRefused(write: () => Promise<unknown>, expected: string) {
  const err = await write().then(() => null, (e: unknown) => e);
  expect(err, "write was accepted").not.toBeNull();
  const { code, constraint } = pgError(err);
  expect([code, constraint]).toContain(expected);
}

beforeAll(async () => {
  [A, B] = await createUsers(["dba", "dbb"]);
  [buyer] = await createUsers(["dbbuyer"], { creators: false });
});
afterAll(() => removeUsers([A.id, B.id, buyer.id]));

describe("tracks table", () => {
  it("accepts a valid draft (control)", async () => {
    await expect(db.insert(tracks).values(valid())).resolves.toBeDefined();
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["blank title", { title: "   " }, "tracks_title_len"],
    ["title over 100 chars", { title: "a".repeat(101) }, "tracks_title_len"],
    ["slug with spaces and capitals", { slug: "Bad Slug" }, "tracks_slug_format"],
    ["slug with a double dash", { slug: "a--b" }, "tracks_slug_format"],
    ["slug over 80 chars", { slug: "a".repeat(81) }, "tracks_slug_format"],
    ["description over 2000 chars", { description: "a".repeat(2001) }, "tracks_description_len"],
    ["bpm below 40", { bpm: 39 }, "tracks_bpm_range"],
    ["bpm above 250", { bpm: 251 }, "tracks_bpm_range"],
    ["zero copies", { totalSupply: 0 }, "tracks_supply_range"],
    ["1001 copies", { totalSupply: 1001 }, "tracks_supply_range"],
    ["price under $1", { basePriceCents: 99 }, "tracks_price_range"],
    ["price over $500", { basePriceCents: 50_001 }, "tracks_price_range"],
    ["more copies sold than exist", { copiesSold: 11 }, "tracks_copies_sold_range"],
    ["negative copies sold", { copiesSold: -1 }, "tracks_copies_sold_range"],
    ["audio key without size and format", { audioKey: "k.wav" }, "tracks_audio_all_or_none"],
    ["empty audio file", { ...audio(), audioSizeBytes: 0 }, "tracks_audio_size"],
    ["audio over 150 MB", { ...audio(), audioSizeBytes: 150 * 1024 * 1024 + 1 }, "tracks_audio_size"],
    ["published without audio", { status: "published", publishedAt: new Date() }, "tracks_live_needs_audio"],
    ["published without a publish time", { ...audio(), status: "published" }, "tracks_live_needs_audio"],
    ["archived without audio", { status: "archived", publishedAt: new Date() }, "tracks_live_needs_audio"],
    ["unknown genre", { genre: "polka" }, "22P02"],
    ["unknown status", { status: "deleted" }, "22P02"],
  ])("refuses %s", async (_, patch, expected) => {
    await expectRefused(() => insert(patch), expected);
  });

  it("refuses the same slug twice for one creator, but allows it for another", async () => {
    await expectRefused(() => db.insert(tracks).values(valid()), "tracks_creator_slug_uniq");
    await expect(db.insert(tracks).values({ ...valid(), creatorId: B.id })).resolves.toBeDefined();
  });

  it("refuses a track for a user who isn't a creator", async () => {
    await expectRefused(() => insert({ creatorId: buyer.id }), "23503");
  });

  it("refuses later updates that break the rules", async () => {
    await expectRefused(() => db.update(tracks).set({ copiesSold: 11 }).where(eq(tracks.creatorId, A.id)), "tracks_copies_sold_range");
    const [t] = await insert({ ...audio(), status: "published", publishedAt: new Date() }).returning({ id: tracks.id });
    await expectRefused(
      () => db.update(tracks).set({ audioKey: null, audioSizeBytes: null, audioFormat: null }).where(eq(tracks.id, t.id)),
      "tracks_live_needs_audio",
    );
  });
});

describe("deleting accounts", () => {
  it("is blocked while the creator has releases (licenses must survive)", async () => {
    await expectRefused(() => db.delete(creatorProfiles).where(eq(creatorProfiles.userId, A.id)), "23503");
    await expectRefused(() => db.delete(users).where(eq(users.id, A.id)), "23503");
  });
});
