// Licensing a track (phase 5 part 1), with forged input: what a tampered browser could send.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { billingProfiles, db, eq, licenses, tracks } from "@ferrel/db";
import { creatorLicenseCounts, createLicense, licenseOffer, myLicenses } from "@/features/licensing/service";
import type { LicenseFormValues } from "@/features/licensing/rules";
import { createUsers, removeCreatedUsers, type TestUser } from "./support";

let artist: TestUser, advertiser: TestUser, other: TestUser;
let liveId: string, draftId: string, archivedId: string, failedId: string;

const form = (patch: Partial<LicenseFormValues> = {}): LicenseFormValues => ({
  platforms: ["instagram", "tiktok"],
  cities: ["london", "mumbai"],
  term: "30",
  companyName: "Acme Sneakers",
  country: "GB",
  agreed: true,
  ...patch,
});
const error = (r: { ok: boolean; error?: string; errors?: object }) => (r.ok ? "ok" : (r.error ?? JSON.stringify(r.errors)));

beforeAll(async () => {
  [artist, advertiser, other] = await createUsers(["licartist", "licadv", "licother"]);
  const audio = (s: string) => ({ audioKey: `${artist.id}/x/${s}.wav`, audioSizeBytes: 10, audioFormat: "wav" as const, audioStatus: "processing" as const });
  const base = { creatorId: artist.id, genre: "pop" as const, baseRateMicros: 750_000 };
  const live = { status: "published" as const, publishedAt: new Date() };
  [{ id: liveId }, { id: draftId }, { id: archivedId }, { id: failedId }] = await db
    .insert(tracks)
    .values([
      { ...base, ...audio("live"), ...live, title: "Live", slug: "lic-live" },
      { ...base, title: "Draft", slug: "lic-draft" },
      { ...base, ...audio("archived"), ...live, status: "archived", title: "Archived", slug: "lic-archived" },
      { ...base, ...audio("failed"), ...live, audioStatus: "failed", audioError: "This file has no audio in it.", title: "Failed", slug: "lic-failed" },
    ])
    .returning({ id: tracks.id });
});
afterAll(removeCreatedUsers);

describe("createLicense", () => {
  it("licenses a published track at its base rate, locked, for exactly the term, and saves billing details", async () => {
    const r = await createLicense(advertiser.id, liveId, form());
    expect(r.ok).toBe(true);
    const [l] = await db.select().from(licenses).where(eq(licenses.licenseeId, advertiser.id));
    expect(l).toMatchObject({ trackId: liveId, platforms: ["instagram", "tiktok"], cities: ["london", "mumbai"], termDays: 30, rateMicros: 750_000 });
    expect(l.endsAt.getTime() - l.startsAt.getTime()).toBe(30 * 24 * 60 * 60_000);
    expect(l.quote).toMatchObject({ rateMicros: 750_000, factors: [], inputs: { baseRateMicros: 750_000 } });
    expect(l.termsVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [billing] = await db.select().from(billingProfiles).where(eq(billingProfiles.userId, advertiser.id));
    expect(billing).toMatchObject({ companyName: "Acme Sneakers", country: "GB" });
  });

  it("keeps the locked rate when the artist later changes their base rate", async () => {
    await db.update(tracks).set({ baseRateMicros: 2_000_000 }).where(eq(tracks.id, liveId));
    const [l] = await db.select().from(licenses).where(eq(licenses.licenseeId, advertiser.id));
    expect(l.rateMicros).toBe(750_000);
    // A new license uses the new rate.
    expect((await createLicense(advertiser.id, liveId, form({ companyName: "", country: "" }))).ok).toBe(true);
    const rates = (await db.select({ r: licenses.rateMicros }).from(licenses).where(eq(licenses.licenseeId, advertiser.id))).map((x) => x.r);
    expect(rates.sort()).toEqual([2_000_000, 750_000].sort());
  });

  it("ignores a rate smuggled into the request: the server always works it out", async () => {
    await createLicense(other.id, liveId, { ...form(), rateMicros: 1 } as LicenseFormValues);
    const [l] = await db.select().from(licenses).where(eq(licenses.licenseeId, other.id));
    expect(l.rateMicros).toBe(2_000_000);
  });

  it("asks for billing details the first time only", async () => {
    const [fresh] = await createUsers(["licfresh"]);
    expect(error(await createLicense(fresh.id, liveId, form({ companyName: "", country: "" })))).toContain("companyName");
    expect((await createLicense(fresh.id, liveId, form())).ok).toBe(true);
    expect((await createLicense(fresh.id, liveId, form({ companyName: "", country: "" }))).ok).toBe(true);
  });

  it.each([
    ["a draft", () => draftId, "isn't available to license"],
    ["an archived release", () => archivedId, "isn't available to license"],
    ["a release whose audio failed", () => failedId, "isn't available to license"],
    ["a track that doesn't exist", () => "00000000-0000-4000-8000-000000000000", "isn't available to license"],
    ["a malformed id", () => "1 or 1=1", "isn't available to license"],
  ])("refuses %s", async (_, id, message) => {
    expect(error(await createLicense(advertiser.id, id(), form()))).toContain(message);
  });

  it("refuses the artist's own track", async () => {
    expect(error(await createLicense(artist.id, liveId, form()))).toContain("your own");
  });

  it("refuses invalid choices without saving anything", async () => {
    const before = (await db.select().from(licenses).where(eq(licenses.licenseeId, advertiser.id))).length;
    expect(error(await createLicense(advertiser.id, liveId, form({ platforms: ["myspace"], cities: ["atlantis"], term: "7", agreed: false })))).toEqual(
      expect.stringContaining("platforms"),
    );
    expect((await db.select().from(licenses).where(eq(licenses.licenseeId, advertiser.id))).length).toBe(before);
  });
});

describe("licenseOffer", () => {
  it("tells the page the rate, and whether billing details are still needed", async () => {
    const [fresh] = await createUsers(["licoffer"]);
    expect(await licenseOffer(fresh.id, liveId)).toEqual({ ok: true, rateMicros: 2_000_000, needsBilling: true });
    expect(await licenseOffer(advertiser.id, liveId)).toEqual({ ok: true, rateMicros: 2_000_000, needsBilling: false });
    expect(await licenseOffer(artist.id, liveId)).toMatchObject({ ok: false, error: expect.stringContaining("your own") });
    expect(await licenseOffer(advertiser.id, draftId)).toMatchObject({ ok: false });
  });
});

describe("listing", () => {
  it("shows each advertiser only their own licenses", async () => {
    const mine = await myLicenses(advertiser.id);
    expect(mine).toHaveLength(2);
    expect(mine[0]).toMatchObject({ trackTitle: "Live", platforms: expect.any(Array), cities: expect.any(Array) });
    expect(mine.every((l) => !("licenseeId" in l))).toBe(true);
    expect(await myLicenses(artist.id)).toEqual([]);
  });

  it("counts a creator's active licenses, in total and per track", async () => {
    expect(await creatorLicenseCounts(artist.id)).toEqual({ active: 5, byTrack: { [liveId]: 5 } });
    expect(await creatorLicenseCounts(advertiser.id)).toEqual({ active: 0, byTrack: {} });
  });
});
