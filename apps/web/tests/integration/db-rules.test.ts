// The database as a backstop: invalid rows written directly (bypassing all app
// code) are refused by Postgres with the expected constraint.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { billingProfiles, creatorProfiles, db, eq, licenses, sql, tracks, users } from "@ferrel/db";
import { createUsers, pgError, removeCreatedUsers, type TestUser } from "./support";

let A: TestUser, B: TestUser, buyer: TestUser;
type TrackRow = typeof tracks.$inferInsert;

const valid = (): TrackRow => ({ creatorId: A.id, title: "Valid", slug: "valid", genre: "pop", baseRateMicros: 5_000_000 });
// Built when the test table is collected (before users exist), so no user ids here.
const audio = () => ({ audioKey: "db-rules/t/x.wav", audioSizeBytes: 100, audioFormat: "wav" as const, audioStatus: "processing" as const });
/** A waveform: `n` bars of height `v` (0–1000). */
const wave = (n = 200, v = 500) => Array<number>(n).fill(v);
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
afterAll(removeCreatedUsers);

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
    ["rate under $0.01", { baseRateMicros: 9_999 }, "tracks_rate_range"],
    ["rate over $50", { baseRateMicros: 50_000_001 }, "tracks_rate_range"],
    ["zero-length track", { ...audio(), durationMs: 0 }, "tracks_duration_range"],
    ["track over 4 hours", { ...audio(), durationMs: 4 * 60 * 60 * 1000 + 1 }, "tracks_duration_range"],
    ["audio key without size and format", { audioKey: "k.wav" }, "tracks_audio_all_or_none"],
    ["empty audio file", { ...audio(), audioSizeBytes: 0 }, "tracks_audio_size"],
    ["audio over 150 MB", { ...audio(), audioSizeBytes: 150 * 1024 * 1024 + 1 }, "tracks_audio_size"],
    ["published without audio", { status: "published", publishedAt: new Date() }, "tracks_live_needs_audio"],
    ["published without a publish time", { ...audio(), status: "published" }, "tracks_live_needs_audio"],
    ["archived without audio", { status: "archived", publishedAt: new Date() }, "tracks_live_needs_audio"],
    // Audio processing results (phase 4 slice 3)
    ["audio with status 'none'", { ...audio(), audioStatus: "none" }, "tracks_audio_status_matches_file"],
    ["a processing status without audio", { audioStatus: "processing" }, "tracks_audio_status_matches_file"],
    ["'ready' without a length", { ...audio(), audioStatus: "ready" }, "tracks_audio_ready_has_length"],
    ["'failed' without a reason", { ...audio(), audioStatus: "failed" }, "tracks_audio_error"],
    ["a reason without 'failed'", { ...audio(), audioError: "Not audio" }, "tracks_audio_error"],
    ["a blank reason", { ...audio(), audioStatus: "failed", audioError: "   " }, "tracks_audio_error"],
    ["a reason that is only line breaks", { ...audio(), audioStatus: "failed", audioError: "\n\t" }, "tracks_audio_error"],
    ["a reason over 500 chars", { ...audio(), audioStatus: "failed", audioError: "a".repeat(501) }, "tracks_audio_error"],
    ["a preview file while previews are off", { ...audio(), previewEnabled: false, previewKey: "p/x.mp3" }, "tracks_preview_off_no_file"],
    ["a preview file without audio", { previewKey: "p/x.mp3" }, "tracks_audio_results_need_file"],
    ["a waveform without audio", { waveform: wave() }, "tracks_audio_results_need_file"],
    ["a length without audio", { durationMs: 60_000 }, "tracks_audio_results_need_file"],
    // The start is only chosen on the waveform, once the length is known; otherwise
    // the worker's later "ready + length" write could be refused and the track stuck.
    ["a start while the length is still unknown", { ...audio(), previewStartMs: 30_000 }, "tracks_preview_start"],
    ["a negative preview start", { ...audio(), previewStartMs: -1 }, "tracks_preview_start"],
    ["a start leaving under 15 s", { ...audio(), durationMs: 60_000, previewStartMs: 45_001 }, "tracks_preview_start"],
    ["a non-zero start in a track under 15 s", { ...audio(), durationMs: 10_000, previewStartMs: 1 }, "tracks_preview_start"],
    ["199 waveform bars", { ...audio(), waveform: wave(199) }, "tracks_waveform_shape"],
    ["201 waveform bars", { ...audio(), waveform: wave(201) }, "tracks_waveform_shape"],
    ["a bar above 1000", { ...audio(), waveform: [...wave(199), 1001] }, "tracks_waveform_shape"],
    ["a negative bar", { ...audio(), waveform: [-1, ...wave(199)] }, "tracks_waveform_shape"],
    ["unknown audio status", { audioStatus: "done" }, "22P02"],
    // The full-song link (slice 11): https, an allowed site, a path.
    ["a listen link to another site", { listenUrl: "https://evil.com/song" }, "tracks_listen_url"],
    ["a listen link over http", { listenUrl: "http://youtu.be/abc" }, "tracks_listen_url"],
    ["a lookalike listen link", { listenUrl: "https://youtube.com.evil.com/x" }, "tracks_listen_url"],
    ["a listen link with a hidden login", { listenUrl: "https://youtube.com@evil.com/x" }, "tracks_listen_url"],
    ["a listen link over 300 chars", { listenUrl: `https://youtu.be/${"a".repeat(300)}` }, "tracks_listen_url"],
    ["unknown genre", { genre: "polka" }, "22P02"],
    ["unknown status", { status: "deleted" }, "22P02"],
  ])("refuses %s", async (_, patch, expected) => {
    await expectRefused(() => insert(patch), expected);
  });

  it.each<[string, Record<string, unknown>]>([
    ["a fully processed track", { ...audio(), audioStatus: "ready", durationMs: 60_000, previewStartMs: 45_000, previewKey: "p/x.mp3", waveform: wave() }],
    ["a track under 15 s previewed from 0", { ...audio(), audioStatus: "ready", durationMs: 10_000, previewStartMs: 0 }],
    ["a failed track with a reason", { ...audio(), audioStatus: "failed", audioError: "That file isn't valid audio." }],
    ["previews switched off", { ...audio(), previewEnabled: false }],
    ["a full-song link on Spotify", { listenUrl: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" }],
    // The old preview stays while a new one is made (start changed) or if making it failed.
    ["a preview kept while a new one is made", { ...audio(), previewKey: "p/x.mp3" }],
    ["a preview kept after making a new one failed", { ...audio(), audioStatus: "failed", audioError: "Preview failed.", previewKey: "p/x.mp3" }],
    ["a silent waveform and a full-scale one", { ...audio(), waveform: [...wave(100, 0), ...wave(100, 1000)] }],
  ])("accepts %s (control)", async (_, patch) => {
    await expect(insert(patch)).resolves.toBeDefined();
  });

  it.each([
    ["an empty bar", sql`array_append(array_fill(1::smallint, array[199]), null)`],
    ["a 10 × 20 grid (200 values, wrong shape)", sql`array_fill(1::smallint, array[10, 20])`],
  ])("refuses a waveform with %s", async (_, waveform) => {
    const [t] = await insert(audio()).returning({ id: tracks.id });
    await expectRefused(() => db.execute(sql`update tracks set waveform = ${waveform} where id = ${t.id}`), "tracks_waveform_shape");
  });

  it("starts every track with no audio status and previews on", async () => {
    const [t] = await insert({}).returning({ status: tracks.audioStatus, preview: tracks.previewEnabled });
    expect(t).toEqual({ status: "none", preview: true });
  });

  it("refuses the same slug twice for one creator, but allows it for another", async () => {
    await expectRefused(() => db.insert(tracks).values(valid()), "tracks_creator_slug_uniq");
    await expect(db.insert(tracks).values({ ...valid(), creatorId: B.id })).resolves.toBeDefined();
  });

  it("refuses a track for a user who isn't a creator", async () => {
    await expectRefused(() => insert({ creatorId: buyer.id }), "23503");
  });

  it("refuses later updates that break the rules", async () => {
    await expectRefused(() => db.update(tracks).set({ baseRateMicros: 0 }).where(eq(tracks.creatorId, A.id)), "tracks_rate_range");
    const [t] = await insert({ ...audio(), status: "published", publishedAt: new Date() }).returning({ id: tracks.id });
    await expectRefused(
      () => db.update(tracks).set({ audioKey: null, audioSizeBytes: null, audioFormat: null, audioStatus: "none" }).where(eq(tracks.id, t.id)),
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

describe("licenses table (phase 5)", () => {
  const day = 24 * 60 * 60_000;
  let trackId = "";
  const license = (patch: Record<string, unknown> = {}) => {
    const startsAt = new Date("2026-11-13T00:00:00Z");
    return db.insert(licenses).values({
      trackId,
      licenseeId: B.id,
      platforms: ["instagram"],
      cities: ["london"],
      termDays: 30,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * day),
      rateMicros: 500_000,
      quote: { rateMicros: 500_000, factors: [] },
      termsVersion: "2026-11-13",
      ...patch,
    } as typeof licenses.$inferInsert);
  };

  beforeAll(async () => {
    [{ id: trackId }] = await insert({ ...audio(), status: "published", publishedAt: new Date() }).returning({ id: tracks.id });
  });

  it("accepts a valid license (control)", async () => {
    await expect(license()).resolves.toBeDefined();
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["no platform", { platforms: [] }, "licenses_platforms"],
    ["no city", { cities: [] }, "licenses_cities"],
    ["an unknown city", { cities: ["atlantis"] }, "licenses_cities"],
    ["a term that isn't offered", { termDays: 45, endsAt: new Date(new Date("2026-11-13T00:00:00Z").getTime() + 45 * day) }, "licenses_term"],
    ["an end date that doesn't match the term", { endsAt: new Date("2027-01-01T00:00:00Z") }, "licenses_dates"],
    ["a rate under $0.01", { rateMicros: 9_999 }, "licenses_rate"],
    ["an unknown platform", { platforms: ["myspace"] }, "22P02"],
  ])("refuses %s", async (_, patch, expected) => {
    await expectRefused(() => license(patch), expected);
  });

  it("keeps a licensed track and its licensee from being deleted", async () => {
    await expectRefused(() => db.delete(tracks).where(eq(tracks.id, trackId)), "23503");
  });

  it("refuses billing details with an unknown country or a blank company", async () => {
    await expectRefused(() => db.insert(billingProfiles).values({ userId: B.id, companyName: "Acme", country: "XX" }), "billing_profiles_country");
    await expectRefused(() => db.insert(billingProfiles).values({ userId: B.id, companyName: "  ", country: "GB" }), "billing_profiles_company_name_len");
  });
});
