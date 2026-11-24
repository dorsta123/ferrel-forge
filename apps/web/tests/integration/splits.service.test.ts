// Contributor splits (phase 5 part 3), with forged input: what a tampered browser or a leaked link could do.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, licenses, paymentCards, splitShares, splitVersions, sql, tracks } from "@ferrel/db";
import { createLicense, licenseOffer } from "@/features/licensing/service";
import type { LicenseFormValues } from "@/features/licensing/rules";
import { currentSplit } from "@/features/splits/queries";
import { getInvite, mySplits, respondByCode, respondToShare } from "@/features/splits/respond";
import { createInviteLink, saveSplit, type SplitRowSubmit } from "@/features/splits/service";
import { createUsers, pgError, removeCreatedUsers, type TestUser } from "./support";

let lead: TestUser, sam: TestUser, ana: TestUser, other: TestUser, buyer: TestUser;
let trackId = "";
let otherTrackId = "";

const row = (name: string, percent: string, patch: Partial<SplitRowSubmit> = {}): SplitRowSubmit => ({ name, role: "vocalist", roleNote: "", percent, ...patch });
const leadRow = (percent: string) => row("Lead Artist", percent, { role: "producer" });
/** Saves as the editor does: based on the version it was showing (the one in force). */
const save = async (userId: string, track: string, rows: SplitRowSubmit[]) => saveSplit(userId, track, rows, (await currentSplit(track))?.version ?? 0);
const licenseForm = (): LicenseFormValues => ({
  shownRateMicros: 500_000,
  platforms: ["tiktok"],
  cities: ["london"],
  term: "30",
  companyName: "Acme",
  country: "GB",
  agreed: true,
});

async function inviteFor(name: string): Promise<string> {
  const split = await currentSplit(trackId);
  const share = split!.shares.find((s) => s.name === name)!;
  const r = await createInviteLink(lead.id, trackId, share.id);
  if (!r.ok) throw new Error(r.error);
  return r.code;
}

beforeAll(async () => {
  [lead, sam, ana, other, buyer] = await createUsers(["splead", "spsam", "spana", "spother", "spbuyer"]);
  const audio = (s: string) => ({ audioKey: `${lead.id}/x/${s}.wav`, audioSizeBytes: 10, audioFormat: "wav" as const, audioStatus: "processing" as const });
  [{ id: trackId }, { id: otherTrackId }] = await db
    .insert(tracks)
    .values([
      { creatorId: lead.id, title: "Split Song", slug: "split-song", genre: "pop", ...audio("a"), status: "published", publishedAt: new Date() },
      { creatorId: other.id, title: "Not Yours", slug: "not-yours", genre: "pop", ...audio("b"), status: "published", publishedAt: new Date() },
    ])
    .returning({ id: tracks.id });
  await db.insert(paymentCards).values({ userId: buyer.id, provider: "simulated", brand: "visa", last4: "4242" });
});
afterAll(removeCreatedUsers);

describe("before any split", () => {
  it("a track with no split is 100% the lead artist's and can be licensed; the license locks an automatic version 1", async () => {
    expect(await currentSplit(trackId)).toBeNull();
    const r = await createLicense(buyer.id, trackId, licenseForm());
    if (!r.ok) throw new Error(JSON.stringify(r));
    const split = await currentSplit(trackId);
    expect(split).toMatchObject({ version: 1, shares: [{ isLead: true, basisPoints: 10_000, status: "accepted" }] });
    const [l] = await db.select({ v: licenses.splitVersionId }).from(licenses).where(eq(licenses.id, r.licenseId));
    expect(l.v).toBe(split!.versionId);
  });
});

describe("the lead artist's split", () => {
  it("saves a new version; the lead is accepted, everyone else pending", async () => {
    expect(await save(lead.id, trackId, [leadRow("60"), row("Sam", "30"), row("Ana", "10", { role: "writer" })])).toEqual({ ok: true });
    const split = await currentSplit(trackId);
    expect(split?.version).toBe(2);
    expect(split?.shares.map((s) => [s.name, s.basisPoints, s.status, s.isLead])).toEqual([
      ["Lead Artist", 6_000, "accepted", true],
      ["Sam", 3_000, "pending", false],
      ["Ana", 1_000, "pending", false],
    ]);
  });

  it("refuses someone else's track, a malformed id, and totals that aren't 100%", async () => {
    expect(await save(sam.id, trackId, [leadRow("100")])).toMatchObject({ ok: false });
    expect(await save(lead.id, otherTrackId, [leadRow("100")])).toMatchObject({ ok: false });
    expect(await save(lead.id, "1 or 1=1", [leadRow("100")])).toMatchObject({ ok: false });
    expect(await save(lead.id, trackId, [leadRow("60"), row("Sam", "39.99")])).toMatchObject({ ok: false, errors: { form: expect.stringContaining("99.99%") } });
    expect((await currentSplit(trackId))?.version).toBe(2);
  });

  it("only the lead artist can make invite links, only for pending people on the current split", async () => {
    const split = (await currentSplit(trackId))!;
    const [leadShare, samShare] = split.shares;
    expect(await createInviteLink(sam.id, trackId, samShare.id)).toMatchObject({ ok: false });
    expect(await createInviteLink(lead.id, trackId, leadShare.id)).toMatchObject({ ok: false });
    expect(await createInviteLink(lead.id, otherTrackId, samShare.id)).toMatchObject({ ok: false });
    expect(await createInviteLink(lead.id, trackId, "not-a-uuid")).toMatchObject({ ok: false });
    const r = await createInviteLink(lead.id, trackId, samShare.id);
    expect(r).toMatchObject({ ok: true, code: expect.stringMatching(/^[A-Za-z0-9_-]{32,}$/) });
    // Only a hash is stored, never the code itself.
    const [stored] = await db.select({ hash: splitShares.inviteHash }).from(splitShares).where(eq(splitShares.id, samShare.id));
    expect(stored.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.hash).not.toContain(r.ok ? r.code : "");
  });
});

describe("licensing while someone is pending", () => {
  it("refuses, and says why", async () => {
    expect(await licenseOffer(buyer.id, trackId)).toMatchObject({ ok: false, error: expect.stringContaining("contributors") });
    expect(await createLicense(buyer.id, trackId, licenseForm())).toMatchObject({ ok: false, error: expect.stringContaining("contributors") });
  });
});

describe("invite links", () => {
  it("shows the invitee the track, their share and the whole split", async () => {
    const code = await inviteFor("Sam");
    const invite = await getInvite(sam.id, code);
    expect(invite).toMatchObject({
      ok: true,
      invite: { trackTitle: "Split Song", share: { name: "Sam", basisPoints: 3_000 }, shares: [{ name: "Lead Artist" }, { name: "Sam" }, { name: "Ana" }] },
    });
  });

  it("making a new link kills the old one", async () => {
    const first = await inviteFor("Sam");
    const second = await inviteFor("Sam");
    expect((await getInvite(sam.id, first)).ok).toBe(false);
    expect((await getInvite(sam.id, second)).ok).toBe(true);
  });

  it("refuses malformed and unknown codes", async () => {
    for (const code of ["", "x", "' or 1=1 --", "A".repeat(43)]) expect((await getInvite(sam.id, code)).ok).toBe(false);
  });

  it("the lead artist can't take a contributor's share (they're already on the split)", async () => {
    const code = await inviteFor("Sam");
    expect(await respondByCode(lead.id, code, "accept")).toMatchObject({ ok: false });
  });

  it("accepting ties the share to the account and uses up the link", async () => {
    const code = await inviteFor("Sam");
    expect(await respondByCode(sam.id, code, "accept")).toEqual({ ok: true });
    expect(await respondByCode(sam.id, code, "accept")).toMatchObject({ ok: false });
    expect(await respondByCode(other.id, code, "decline")).toMatchObject({ ok: false });
    const [s] = await db.select().from(splitShares).where(sql`${splitShares.userId} = ${sam.id}`);
    expect(s).toMatchObject({ status: "accepted", inviteHash: null });
  });

  it("one person can't hold two shares in the same split", async () => {
    const code = await inviteFor("Ana");
    expect(await respondByCode(sam.id, code, "accept")).toMatchObject({ ok: false, error: expect.stringContaining("already") });
  });

  it("someone else's share can't be answered by id", async () => {
    const ana_ = (await currentSplit(trackId))!.shares.find((s) => s.name === "Ana")!;
    expect(await respondToShare(other.id, ana_.id, "accept")).toMatchObject({ ok: false });
    expect(await respondToShare(other.id, "not-a-uuid", "accept")).toMatchObject({ ok: false });
  });

  it("once everyone accepts, the track can be licensed and the license locks this version", async () => {
    expect(await respondByCode(ana.id, await inviteFor("Ana"), "accept")).toEqual({ ok: true });
    expect(await licenseOffer(buyer.id, trackId)).toMatchObject({ ok: true });
    const r = await createLicense(buyer.id, trackId, licenseForm());
    if (!r.ok) throw new Error(JSON.stringify(r));
    const [l] = await db.select({ v: licenses.splitVersionId }).from(licenses).where(eq(licenses.id, r.licenseId));
    expect(l.v).toBe((await currentSplit(trackId))!.versionId);
  });
});

describe("changing the split", () => {
  it("makes a new version: people already on it stay linked but must accept again; running licenses keep theirs", async () => {
    const before = (await currentSplit(trackId))!;
    const [, samShare, anaShare] = before.shares;
    expect(
      await save(lead.id, trackId, [leadRow("50"), row("Sam", "40", { shareId: samShare.id }), row("Ana", "10", { role: "writer", shareId: anaShare.id })]),
    ).toEqual({ ok: true });
    const after = (await currentSplit(trackId))!;
    expect(after.version).toBe(3);
    expect(after.shares.map((s) => [s.name, s.status, s.hasAccount])).toEqual([
      ["Lead Artist", "accepted", true],
      ["Sam", "pending", true],
      ["Ana", "pending", true],
    ]);
    const locked = await db.select({ v: licenses.splitVersionId }).from(licenses).where(eq(licenses.trackId, trackId));
    expect(locked.map((l) => l.v)).not.toContain(after.versionId);
    expect(await licenseOffer(buyer.id, trackId)).toMatchObject({ ok: false });
  });

  it("an old version's link no longer works", async () => {
    const code = await inviteFor("Sam");
    const [, samShare, anaShare] = (await currentSplit(trackId))!.shares;
    await save(lead.id, trackId, [leadRow("50"), row("Sam", "45", { shareId: samShare.id }), row("Ana", "5", { role: "writer", shareId: anaShare.id })]);
    expect((await currentSplit(trackId))!.version).toBe(4);
    expect((await getInvite(sam.id, code)).ok).toBe(false);
    expect(await respondByCode(sam.id, code, "accept")).toMatchObject({ ok: false });
  });

  it("people already on the split answer from 'My splits', by share id", async () => {
    const mine = await mySplits(sam.id);
    expect(mine).toMatchObject([{ trackTitle: "Split Song", basisPoints: 4_500, status: "pending" }]);
    expect(await respondToShare(sam.id, mine[0].shareId, "accept")).toEqual({ ok: true });
  });

  it("can't carry over a share from another track or the lead's own row", async () => {
    const [foreign] = await db.insert(splitVersions).values({ trackId: otherTrackId, version: 1 }).returning();
    const [foreignShare] = await db
      .insert(splitShares)
      .values({ splitVersionId: foreign.id, position: 0, name: "X", role: "producer", basisPoints: 10_000, isLead: true, userId: other.id, status: "accepted", respondedAt: new Date() })
      .returning();
    const [leadShare, samShare, anaShare] = (await currentSplit(trackId))!.shares;
    const keep = [row("Sam", "40", { shareId: samShare.id }), row("Ana", "5", { role: "writer", shareId: anaShare.id })];
    expect(await save(lead.id, trackId, [leadRow("50"), ...keep, row("Thief", "5", { shareId: foreignShare.id })])).toMatchObject({ ok: false });
    expect(await save(lead.id, trackId, [leadRow("50"), ...keep, row("Me again", "5", { shareId: leadShare.id })])).toMatchObject({ ok: false });
  });

  it("a declined share: the lead sees it and edits the split", async () => {
    const ana_ = (await mySplits(ana.id))[0];
    expect(await respondToShare(ana.id, ana_.shareId, "decline")).toEqual({ ok: true });
    expect((await currentSplit(trackId))!.shares.find((s) => s.name === "Ana")?.status).toBe("declined");
    expect(await licenseOffer(buyer.id, trackId)).toMatchObject({ ok: false });
  });
});

describe("consent and stale forms (review)", () => {
  let songId = "";
  beforeAll(async () => {
    [{ id: songId }] = await db.insert(tracks).values({ creatorId: lead.id, title: "Consent", slug: "consent", genre: "pop" }).returning({ id: tracks.id });
    await saveSplit(lead.id, songId, [leadRow("70"), row("Sam", "30")], 0);
    const samShare = (await currentSplit(songId))!.shares[1];
    const r = await createInviteLink(lead.id, songId, samShare.id);
    if (!r.ok) throw new Error(r.error);
    expect(await respondByCode(sam.id, r.code, "accept")).toEqual({ ok: true });
  });

  it("someone who accepted can't be removed, or cut out by the lead taking 100%", async () => {
    expect(await saveSplit(lead.id, songId, [leadRow("100")], 1)).toMatchObject({ ok: false, errors: { form: expect.stringContaining("Sam") } });
    expect(await saveSplit(lead.id, songId, [leadRow("70"), row("Someone else", "30")], 1)).toMatchObject({ ok: false });
    expect((await currentSplit(songId))!.version).toBe(1);
  });

  it("their share can change, and then they must accept again", async () => {
    const samShare = (await currentSplit(songId))!.shares[1];
    expect(await saveSplit(lead.id, songId, [leadRow("80"), row("Sam", "20", { shareId: samShare.id })], 1)).toEqual({ ok: true });
    expect((await currentSplit(songId))!.shares[1]).toMatchObject({ basisPoints: 2_000, status: "pending", hasAccount: true });
  });

  it("someone pending or declined can be removed", async () => {
    const samShare = (await currentSplit(songId))!.shares[1];
    expect(await respondToShare(sam.id, samShare.id, "decline")).toEqual({ ok: true });
    expect(await saveSplit(lead.id, songId, [leadRow("100")], 2)).toEqual({ ok: true });
    expect((await currentSplit(songId))!.version).toBe(3);
  });

  it("a form based on an older version is refused instead of overwriting a newer split", async () => {
    expect(await saveSplit(lead.id, songId, [leadRow("90"), row("Bo", "10")], 2)).toMatchObject({ ok: false, errors: { form: expect.stringContaining("changed") } });
    expect(await saveSplit(lead.id, songId, [leadRow("90"), row("Bo", "10")], 0)).toMatchObject({ ok: false });
    expect((await currentSplit(songId))!.version).toBe(3);
  });

  it("saving an unchanged split makes no new version, so nobody is asked again", async () => {
    expect(await saveSplit(lead.id, songId, [leadRow("100")], 3)).toEqual({ ok: true });
    expect((await currentSplit(songId))!.version).toBe(3);
  });

  it("two saves from the same version at once: one wins, the other is told it changed", async () => {
    const results = await Promise.all([
      saveSplit(lead.id, songId, [leadRow("90"), row("Bo", "10")], 3),
      saveSplit(lead.id, songId, [leadRow("80"), row("Cy", "20")], 3),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await currentSplit(songId))!.version).toBe(4);
  });
});

describe("database checks", () => {
  it.each([
    ["a share under 0.5%", { basisPoints: 49 }],
    ["an answer without an account", { status: "accepted" as const, respondedAt: new Date() }],
    ["a lead who isn't accepted", { isLead: true }],
    ["a role note on a non-'other' role", { roleNote: "drums" }],
    ["a malformed invite hash", { inviteHash: "abc" }],
  ])("refuses %s", async (_, patch) => {
    const [v] = await db.insert(splitVersions).values({ trackId: otherTrackId, version: 100 + Math.floor(Math.random() * 1e6) }).returning();
    const err = await db
      .insert(splitShares)
      .values({ splitVersionId: v.id, position: 0, name: "Someone", role: "producer", basisPoints: 100, ...patch })
      .catch((e: unknown) => e);
    expect(pgError(err).code).toBe("23514");
  });

  it("a license can't lock another track's split", async () => {
    const [foreign] = await db.select().from(splitVersions).where(eq(splitVersions.trackId, otherTrackId)).limit(1);
    const err = await db
      .insert(licenses)
      .values({
        trackId,
        licenseeId: buyer.id,
        platforms: ["tiktok"],
        cities: ["london"],
        termDays: 30,
        startsAt: new Date(0),
        endsAt: new Date(30 * 86_400_000),
        rateMicros: 500_000,
        quote: {},
        termsVersion: "x",
        splitVersionId: foreign.id,
      })
      .catch((e: unknown) => e);
    expect(pgError(err).code).toBe("23503");
  });
});
