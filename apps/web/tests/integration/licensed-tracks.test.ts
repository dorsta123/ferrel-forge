// Phase 5 part 4: licensed tracks are protected, and licenses can be extended. Forged input throughout.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, licenseExtensions, licenses, paymentCards, tracks } from "@ferrel/db";
import { requestAudioUpload } from "@/features/audio-upload/service";
import { extendLicense } from "@/features/licensing/extend";
import { masterDownload } from "@/features/licensing/master-download";
import { changeReleaseStatus } from "@/features/releases/service";
import { createUsers, leadSplit, pgError, removeCreatedUsers, type TestUser } from "./support";

const DAY = 86_400_000;
let artist: TestUser, buyer: TestUser, stranger: TestUser;
const splitOf = new Map<string, string>(); // track → its "100% lead" split version

async function track(slug: string) {
  const [t] = await db
    .insert(tracks)
    .values({ creatorId: artist.id, title: slug, slug, genre: "pop", audioKey: `${artist.id}/x/${slug}.wav`, audioSizeBytes: 10, audioFormat: "wav", audioStatus: "processing", status: "published", publishedAt: new Date() })
    .returning({ id: tracks.id });
  splitOf.set(t.id, await leadSplit(t.id, artist.id));
  return t.id;
}

async function license(trackId: string, startsAt: Date, termDays = 30) {
  const splitVersionId = splitOf.get(trackId)!;
  const [l] = await db
    .insert(licenses)
    .values({ trackId, licenseeId: buyer.id, platforms: ["tiktok"], cities: ["london"], termDays, startsAt, endsAt: new Date(startsAt.getTime() + termDays * DAY), rateMicros: 500_000, quote: {}, termsVersion: "2026-11-13", splitVersionId })
    .returning({ id: licenses.id });
  return l.id;
}

const failure = (r: { ok: boolean; error?: string }) => (r.ok ? "ok" : r.error);

beforeAll(async () => {
  [artist, buyer, stranger] = await createUsers(["ltartist", "ltbuyer", "ltstranger"]);
  await db.insert(paymentCards).values([buyer, stranger].map((u) => ({ userId: u.id, provider: "simulated" as const, brand: "visa", last4: "4242" })));
});
afterAll(removeCreatedUsers);

describe("a track with an active license", () => {
  it("can't be unpublished; can be once every license has ended", async () => {
    const id = await track("guarded");
    const active = await license(id, new Date());
    expect(failure(await changeReleaseStatus(artist.id, id, "unpublish"))).toContain("active licenses");
    await db.update(licenses).set({ startsAt: new Date(Date.now() - 40 * DAY), endsAt: new Date(Date.now() - 10 * DAY) }).where(eq(licenses.id, active));
    expect(await changeReleaseStatus(artist.id, id, "unpublish")).toEqual({ ok: true });
  });

  it("can be archived: existing licenses keep working, but no new licenses or extensions", async () => {
    const id = await track("archivable");
    const active = await license(id, new Date());
    expect(await changeReleaseStatus(artist.id, id, "archive")).toEqual({ ok: true });
    expect(await masterDownload(buyer.id, active)).toMatchObject({ ok: true });
    expect(failure(await extendLicense(buyer.id, active, "30"))).toContain("no longer");
  });

  it("can't have its audio replaced, even as a draft (e.g. after a race with unpublish)", async () => {
    const id = await track("frozen-audio");
    await license(id, new Date());
    await db.update(tracks).set({ status: "draft" }).where(eq(tracks.id, id)); // forced: the app refuses this
    expect(failure(await requestAudioUpload(artist.id, id, { name: "new.wav", size: 1000, type: "audio/wav" }))).toContain("licensed");
  });
});

describe("extending a license", () => {
  let trackId = "";
  let licenseId = "";
  beforeAll(async () => {
    trackId = await track("extendable");
    licenseId = await license(trackId, new Date());
  });

  it("adds days at the same locked rate and split, and keeps a history", async () => {
    const [before] = await db.select().from(licenses).where(eq(licenses.id, licenseId));
    const r = await extendLicense(buyer.id, licenseId, "90");
    expect(r).toMatchObject({ ok: true });
    const [after] = await db.select().from(licenses).where(eq(licenses.id, licenseId));
    expect(after.endsAt.getTime() - before.endsAt.getTime()).toBe(90 * DAY);
    expect(after).toMatchObject({ extendedDays: 90, rateMicros: before.rateMicros, splitVersionId: before.splitVersionId, termDays: 30 });
    expect(await db.select().from(licenseExtensions).where(eq(licenseExtensions.licenseId, licenseId))).toMatchObject([{ days: 90, previousEndsAt: before.endsAt, endsAt: after.endsAt }]);
  });

  it("refuses someone else's license, a malformed id and terms that aren't offered", async () => {
    expect((await extendLicense(stranger.id, licenseId, "30")).ok).toBe(false);
    expect((await extendLicense(artist.id, licenseId, "30")).ok).toBe(false);
    expect((await extendLicense(buyer.id, "1 or 1=1", "30")).ok).toBe(false);
    for (const days of ["7", "0", "-30", "30.5", "", "1825"]) expect((await extendLicense(buyer.id, licenseId, days)).ok).toBe(false);
  });

  it("refuses an ended license", async () => {
    const ended = await license(trackId, new Date("2020-01-01T00:00:00Z"));
    expect(failure(await extendLicense(buyer.id, ended, "30"))).toContain("ended");
  });

  it("refuses without a usable card", async () => {
    await db.delete(paymentCards).where(eq(paymentCards.userId, buyer.id));
    expect(failure(await extendLicense(buyer.id, licenseId, "30"))).toContain("card");
    await db.insert(paymentCards).values({ userId: buyer.id, provider: "simulated", brand: "visa", last4: "4242" });
  });

  it("stops at 5 years in total", async () => {
    const long = await license(await track("long-one"), new Date(), 365);
    for (let i = 0; i < 4; i++) expect(await extendLicense(buyer.id, long, "365")).toMatchObject({ ok: true });
    expect(failure(await extendLicense(buyer.id, long, "30"))).toContain("5 years");
  });

  it("two extensions at once both count, once each", async () => {
    const [before] = await db.select().from(licenses).where(eq(licenses.id, licenseId));
    const results = await Promise.all([extendLicense(buyer.id, licenseId, "30"), extendLicense(buyer.id, licenseId, "30")]);
    expect(results.every((r) => r.ok)).toBe(true);
    const [after] = await db.select().from(licenses).where(eq(licenses.id, licenseId));
    expect(after.extendedDays - before.extendedDays).toBe(60);
  });
});

describe("database checks", () => {
  it("refuses an end date that doesn't match term + extensions, and more than 5 years", async () => {
    const id = await track("db-checks");
    const l = await license(id, new Date());
    const [row] = await db.select().from(licenses).where(eq(licenses.id, l));
    const fail = (set: Partial<typeof licenses.$inferInsert>) => db.update(licenses).set(set).where(eq(licenses.id, l)).catch((e: unknown) => e);
    expect(pgError(await fail({ extendedDays: 30 })).constraint).toBe("licenses_dates");
    expect(pgError(await fail({ extendedDays: 1_800, endsAt: new Date(row.startsAt.getTime() + 1_830 * DAY) })).constraint).toBe("licenses_extended_days");
    expect(pgError(await fail({ extendedDays: -1 })).code).toBe("23514");
  });

  it("refuses an extension record with odd days or dates", async () => {
    const id = await track("db-ext");
    const l = await license(id, new Date());
    const now = new Date();
    const bad = [
      { days: 7, previousEndsAt: now, endsAt: new Date(now.getTime() + 7 * DAY) },
      { days: 30, previousEndsAt: now, endsAt: new Date(now.getTime() + 31 * DAY) },
    ];
    for (const b of bad) expect(pgError(await db.insert(licenseExtensions).values({ licenseId: l, ...b }).catch((e: unknown) => e)).code).toBe("23514");
  });
});
