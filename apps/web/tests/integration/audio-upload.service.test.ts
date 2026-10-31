// Forged requests against the audio upload service: what a tampered browser could send.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, tracks } from "@ferrel/db";
import { closeQueues } from "@ferrel/queues";
import { createUploadUrl, getObjectInfo, newMasterKey } from "@ferrel/storage";
import { confirmAudioUpload, requestAudioUpload } from "@/features/audio-upload/service";
import { createUsers, removeCreatedUsers, type TestUser } from "./support";

const WAV = { name: "song.wav", size: 1000, type: "audio/wav" };
const error = (r: { ok: boolean; error?: string }) => (r.ok ? "ok" : r.error);

let A: TestUser, B: TestUser;
let draftId: string, otherId: string;

beforeAll(async () => {
  [A, B] = await createUsers(["upa", "upb"]);
  const base = { creatorId: A.id, genre: "pop" as const, basePriceCents: 500 };
  [{ id: draftId }, { id: otherId }] = await db
    .insert(tracks)
    .values([
      { ...base, title: "A draft", slug: "a-draft" },
      { ...base, title: "A other", slug: "a-other" },
    ])
    .returning({ id: tracks.id });
});
// Confirmed uploads send queue tickets; close that connection too.
afterAll(async () => {
  await closeQueues();
  await removeCreatedUsers();
});

describe("requestAudioUpload", () => {
  it("answers 'not found' for someone else's track", async () => {
    expect(error(await requestAudioUpload(B.id, draftId, WAV))).toBe("Track not found.");
  });

  it("answers 'not found' for a malformed id, without a database error", async () => {
    expect(error(await requestAudioUpload(A.id, "'; drop table tracks; --", WAV))).toBe("Track not found.");
  });

  it.each([
    ["an .exe file", { name: "virus.exe", size: 1000, type: "" }],
    ["a declared type that disagrees", { name: "a.wav", size: 1000, type: "text/html" }],
    ["151 MB", { name: "a.wav", size: 151 * 1024 * 1024, type: "" }],
    ["0 bytes", { name: "a.wav", size: 0, type: "" }],
    ["a size that isn't a number", { name: "a.wav", size: Number("x"), type: "" }],
  ])("refuses %s", async (_, file) => {
    expect((await requestAudioUpload(A.id, draftId, file)).ok).toBe(false);
  });

  it("gives a valid request a link inside the creator's own folder", async () => {
    const r = await requestAudioUpload(A.id, draftId, WAV);
    expect(r.ok && r.key.startsWith(`${A.id}/${draftId}/`)).toBe(true);
  });
});

describe("confirmAudioUpload", () => {
  it("answers 'not found' when another creator confirms", async () => {
    expect(error(await confirmAudioUpload(B.id, draftId, newMasterKey(A.id, draftId, "wav")))).toBe("Track not found.");
  });

  it("refuses a key issued for a different track", async () => {
    expect(error(await confirmAudioUpload(A.id, draftId, newMasterKey(A.id, otherId, "wav")))).toBe("Upload not recognised.");
  });

  it("refuses a path-traversal key", async () => {
    expect(error(await confirmAudioUpload(A.id, draftId, `${A.id}/${draftId}/../../x.wav`))).toBe("Upload not recognised.");
  });

  it("refuses when nothing was uploaded", async () => {
    expect(error(await confirmAudioUpload(A.id, draftId, newMasterKey(A.id, draftId, "wav")))).toMatch(/^The upload didn't arrive/);
  });

  it("rejects and deletes a text file uploaded as .wav through a real signed link", async () => {
    const body = "this is plain text pretending to be a wav file";
    const link = await requestAudioUpload(A.id, draftId, { name: "fake.wav", size: body.length, type: "audio/wav" });
    if (!link.ok) throw new Error(link.error);
    const put = await fetch(link.uploadUrl, { method: "PUT", body, headers: { "content-type": link.contentType } });
    expect(put.status).toBe(200);

    expect(error(await confirmAudioUpload(A.id, draftId, link.key))).toContain("isn't valid audio");
    expect(await getObjectInfo("masters", link.key)).toBeNull();
  });

  // A replaced song must not keep the old song's length, waveform, start point or error.
  it.each([
    ["a processed song", { audioStatus: "ready" as const, durationMs: 30_000, previewStartMs: 5_000, waveform: Array<number>(200).fill(500) }],
    ["a failed song", { audioStatus: "failed" as const, audioError: "That file isn't valid audio." }],
  ])("replacing %s clears its old results and marks the new one as processing", async (_, before) => {
    await db
      .update(tracks)
      .set({ audioKey: newMasterKey(A.id, draftId, "wav"), audioSizeBytes: 10, audioFormat: "wav", ...before })
      .where(eq(tracks.id, draftId));

    const wav = Buffer.alloc(44);
    wav.write("RIFF", 0);
    wav.write("WAVE", 8);
    const link = await requestAudioUpload(A.id, draftId, { name: "new.wav", size: wav.length, type: "audio/wav" });
    if (!link.ok) throw new Error(link.error);
    const put = await fetch(link.uploadUrl, { method: "PUT", body: wav, headers: { "content-type": link.contentType } });
    expect(put.status).toBe(200);
    expect(error(await confirmAudioUpload(A.id, draftId, link.key))).toBe("ok");

    const [row] = await db
      .select({ key: tracks.audioKey, status: tracks.audioStatus, error: tracks.audioError, durationMs: tracks.durationMs, start: tracks.previewStartMs, waveform: tracks.waveform })
      .from(tracks)
      .where(eq(tracks.id, draftId));
    expect(row).toEqual({ key: link.key, status: "processing", error: null, durationMs: null, start: null, waveform: null });
  });

  it("replacing the audio removes the old song's preview, so it can never play for the new one", async () => {
    // The old preview, really stored in the public bucket.
    const previewKey = `${A.id}/${draftId}/old-preview.mp3`;
    const body = Buffer.from("ID3 old preview");
    const url = await createUploadUrl({ bucket: "previews", key: previewKey, contentType: "audio/mpeg", contentLength: body.length });
    expect((await fetch(url, { method: "PUT", body, headers: { "content-type": "audio/mpeg" } })).status).toBe(200);
    await db
      .update(tracks)
      .set({ audioKey: newMasterKey(A.id, draftId, "wav"), audioSizeBytes: 10, audioFormat: "wav", audioStatus: "processing", previewKey })
      .where(eq(tracks.id, draftId));

    const wav = Buffer.alloc(44);
    wav.write("RIFF", 0);
    wav.write("WAVE", 8);
    const link = await requestAudioUpload(A.id, draftId, { name: "new.wav", size: wav.length, type: "audio/wav" });
    if (!link.ok) throw new Error(link.error);
    await fetch(link.uploadUrl, { method: "PUT", body: wav, headers: { "content-type": link.contentType } });
    expect(error(await confirmAudioUpload(A.id, draftId, link.key))).toBe("ok");

    const [row] = await db.select({ previewKey: tracks.previewKey }).from(tracks).where(eq(tracks.id, draftId));
    expect(row.previewKey).toBeNull();
    expect(await getObjectInfo("previews", previewKey)).toBeNull();
  });

  it("refuses audio changes once a track is published", async () => {
    await db
      .update(tracks)
      .set({ audioKey: newMasterKey(A.id, otherId, "wav"), audioSizeBytes: 10, audioFormat: "wav", audioStatus: "processing", status: "published", publishedAt: new Date() })
      .where(eq(tracks.id, otherId));
    expect(error(await requestAudioUpload(A.id, otherId, WAV))).toContain("only be changed while the track is a draft");
  });
});
