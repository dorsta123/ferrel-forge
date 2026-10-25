// The database as a backstop: invalid rows written directly (bypassing all app
// code) are refused by Postgres with the expected constraint.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creatorProfiles, db, eq, sql, tracks, users } from "@ferrel/db";
import { createUsers, pgError, removeCreatedUsers, type TestUser } from "./support";

let A: TestUser, B: TestUser, buyer: TestUser;
type TrackRow = typeof tracks.$inferInsert;

const valid = (): TrackRow => ({ creatorId: A.id, title: "Valid", slug: "valid", genre: "pop", basePriceCents: 500 });
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
    ["price under $1", { basePriceCents: 99 }, "tracks_price_range"],
    ["price over $500", { basePriceCents: 50_001 }, "tracks_price_range"],
    ["zero-length track", { durationMs: 0 }, "tracks_duration_range"],
    ["track over 4 hours", { durationMs: 4 * 60 * 60 * 1000 + 1 }, "tracks_duration_range"],
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
    ["a reason over 500 chars", { ...audio(), audioStatus: "failed", audioError: "a".repeat(501) }, "tracks_audio_error"],
    ["a preview file while previews are off", { ...audio(), previewEnabled: false, previewKey: "p/x.mp3" }, "tracks_preview_off_no_file"],
    ["a preview file without audio", { previewKey: "p/x.mp3" }, "tracks_audio_results_need_file"],
    ["a waveform without audio", { waveform: wave() }, "tracks_audio_results_need_file"],
    ["a negative preview start", { ...audio(), previewStartMs: -1 }, "tracks_preview_start"],
    ["a start leaving under 15 s", { ...audio(), durationMs: 60_000, previewStartMs: 45_001 }, "tracks_preview_start"],
    ["a non-zero start in a track under 15 s", { ...audio(), durationMs: 10_000, previewStartMs: 1 }, "tracks_preview_start"],
    ["199 waveform bars", { ...audio(), waveform: wave(199) }, "tracks_waveform_shape"],
    ["201 waveform bars", { ...audio(), waveform: wave(201) }, "tracks_waveform_shape"],
    ["a bar above 1000", { ...audio(), waveform: [...wave(199), 1001] }, "tracks_waveform_shape"],
    ["a negative bar", { ...audio(), waveform: [-1, ...wave(199)] }, "tracks_waveform_shape"],
    ["unknown audio status", { audioStatus: "done" }, "22P02"],
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
    ["a chosen start while the length is still unknown", { ...audio(), previewStartMs: 30_000 }],
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
    await expectRefused(() => db.update(tracks).set({ basePriceCents: 0 }).where(eq(tracks.creatorId, A.id)), "tracks_price_range");
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
