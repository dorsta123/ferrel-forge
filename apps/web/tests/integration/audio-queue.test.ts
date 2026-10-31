// Uploads hand the worker a ticket through the audio queue (phase 4 slice 4).
// Runs against real Redis under a test-only prefix (vitest.integration.config.ts),
// so a worker started by `pnpm dev` can't take these tickets.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, eq, sql, tracks } from "@ferrel/db";
import { audioJobId, closeQueues, getAudioQueue, requeueStuckAudio } from "@ferrel/queues";
import { newMasterKey } from "@ferrel/storage";
import { confirmAudioUpload, requestAudioUpload } from "@/features/audio-upload/service";
import { createUsers, removeCreatedUsers, type TestUser } from "./support";

let A: TestUser;
let uploadId: string, rejectId: string, freshId: string, readyId: string, noPreviewId: string, previewOffId: string;

beforeAll(async () => {
  [A] = await createUsers(["queuea"]);
  const base = { creatorId: A.id, genre: "pop" as const, basePriceCents: 500 };
  [{ id: uploadId }, { id: rejectId }, { id: freshId }, { id: readyId }, { id: noPreviewId }, { id: previewOffId }] = await db
    .insert(tracks)
    .values(["upload", "reject", "fresh", "ready", "no-preview", "preview-off"].map((s) => ({ ...base, title: s, slug: `q-${s}` })))
    .returning({ id: tracks.id });
  await getAudioQueue().drain(true);
});
afterAll(async () => {
  await getAudioQueue().drain(true);
  await closeQueues();
  await removeCreatedUsers();
});

/** Waiting tickets for one track. */
async function ticketsFor(trackId: string) {
  const jobs = await getAudioQueue().getJobs(["waiting", "delayed", "prioritized"]);
  return jobs.filter((j) => j?.data?.trackId === trackId).map((j) => ({ id: j.id, data: j.data }));
}

/** Upload `body` to `trackId` through a real signed link and confirm it. */
async function upload(trackId: string, body: Buffer) {
  const link = await requestAudioUpload(A.id, trackId, { name: "song.wav", size: body.length, type: "audio/wav" });
  if (!link.ok) throw new Error(link.error);
  await fetch(link.uploadUrl, { method: "PUT", body: new Uint8Array(body), headers: { "content-type": link.contentType } });
  return { key: link.key, result: await confirmAudioUpload(A.id, trackId, link.key) };
}

const wav = () => {
  const b = Buffer.alloc(44);
  b.write("RIFF", 0);
  b.write("WAVE", 8);
  return b;
};

describe("audio queue", () => {
  it("a confirmed upload sends one ticket with the track and the exact file", async () => {
    const { key, result } = await upload(uploadId, wav());
    expect(result.ok).toBe(true);
    expect(await ticketsFor(uploadId)).toEqual([{ id: audioJobId({ trackId: uploadId, audioKey: key }), data: { trackId: uploadId, audioKey: key } }]);
  });

  it("confirming the same upload twice still leaves one ticket", async () => {
    const [{ data }] = await ticketsFor(uploadId);
    expect((await confirmAudioUpload(A.id, uploadId, data.audioKey)).ok).toBe(true);
    expect(await ticketsFor(uploadId)).toHaveLength(1);
  });

  it("a rejected upload sends no ticket", async () => {
    const { result } = await upload(rejectId, Buffer.from("plain text pretending to be a wav file"));
    expect(result.ok).toBe(false);
    expect(await ticketsFor(rejectId)).toEqual([]);
  });

  it("the sweep re-sends tickets for unfinished tracks (processing, or ready without a wanted preview), and only those", async () => {
    await getAudioQueue().drain(true); // as if Redis lost the tickets
    const audio = (id: string) => ({ audioKey: newMasterKey(A.id, id, "wav"), audioSizeBytes: 10, audioFormat: "wav" as const });
    const done = { audioStatus: "ready" as const, durationMs: 60_000 };
    await db.update(tracks).set({ ...audio(freshId), audioStatus: "processing" }).where(eq(tracks.id, freshId));
    await db.update(tracks).set({ ...audio(readyId), ...done, previewKey: `${readyId}/p.mp3` }).where(eq(tracks.id, readyId));
    await db.update(tracks).set({ ...audio(noPreviewId), ...done }).where(eq(tracks.id, noPreviewId));
    await db.update(tracks).set({ ...audio(previewOffId), ...done, previewEnabled: false }).where(eq(tracks.id, previewOffId));
    // Stuck = unfinished 10 minutes after the last change. "fresh" was just uploaded; "ready"
    // has everything; "preview-off" needs no preview; "no-preview" lost its preview job.
    await db.execute(sql`update tracks set updated_at = now() - interval '20 minutes' where id in (${uploadId}, ${readyId}, ${noPreviewId}, ${previewOffId})`);

    await requeueStuckAudio({ olderThanMs: 10 * 60_000 });

    const [row] = await db.select({ key: tracks.audioKey }).from(tracks).where(eq(tracks.id, uploadId));
    expect((await ticketsFor(uploadId)).map((t) => t.data)).toEqual([{ trackId: uploadId, audioKey: row.key }]);
    expect(await ticketsFor(freshId)).toEqual([]);
    expect(await ticketsFor(readyId)).toEqual([]);
    expect(await ticketsFor(previewOffId)).toEqual([]);
    expect(await ticketsFor(noPreviewId)).toHaveLength(1);
  });

  it("a second sweep doesn't add a duplicate while the ticket is still waiting", async () => {
    await requeueStuckAudio({ olderThanMs: 10 * 60_000 });
    expect(await ticketsFor(uploadId)).toHaveLength(1);
  });
});
