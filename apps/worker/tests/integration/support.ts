// Test creators for worker integration tests: created straight in the database and
// removed afterwards with their tracks and stored audio (emails match e2e.*@example.com).
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { creatorProfiles, db, eq, sql, tracks, users } from "@ferrel/db";
import { bucketId, createUploadUrl, deleteObject, newMasterKey, type BucketName } from "@ferrel/storage";
import type { AudioFormat } from "@ferrel/db/constants";

const run = Date.now().toString(36);
const created: string[] = [];

export async function createCreator(label: string): Promise<string> {
  const id = randomUUID();
  await db.insert(users).values({ id, name: label, email: `e2e.worker.${label}.${run}@example.com` });
  created.push(id);
  await db.insert(creatorProfiles).values({ userId: id, artistName: `Worker ${label}`, slug: `wk-${label}-${run}`.slice(0, 30) });
  return id;
}

/** A draft track whose master (the file at `path`) is really stored, marked "processing" as after an upload. */
export async function trackWithMaster(creatorId: string, path: string, format: AudioFormat) {
  const [{ id }] = await db
    .insert(tracks)
    .values({ creatorId, title: "Worker test", slug: `wk-${randomUUID().slice(0, 8)}`, genre: "pop", basePriceCents: 500 })
    .returning({ id: tracks.id });
  const body = readFileSync(path);
  const key = newMasterKey(creatorId, id, format);
  const contentType = { wav: "audio/wav", mp3: "audio/mpeg", flac: "audio/flac" }[format];
  const url = await createUploadUrl({ bucket: "masters", key, contentType, contentLength: body.length });
  const put = await fetch(url, { method: "PUT", body: new Uint8Array(body), headers: { "content-type": contentType } });
  if (put.status !== 200) throw new Error(`upload failed: ${put.status}`);
  await db
    .update(tracks)
    .set({ audioKey: key, audioSizeBytes: body.length, audioFormat: format, audioStatus: "processing" })
    .where(eq(tracks.id, id));
  return { trackId: id, audioKey: key };
}

export async function trackRow(id: string) {
  const [row] = await db
    .select({ status: tracks.audioStatus, error: tracks.audioError, durationMs: tracks.durationMs, waveform: tracks.waveform, key: tracks.audioKey, previewKey: tracks.previewKey })
    .from(tracks)
    .where(eq(tracks.id, id));
  return row;
}

export async function removeCreated(): Promise<void> {
  const ids = created.splice(0);
  if (ids.length === 0) return;
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  const owned = sql`${tracks.creatorId} in (${idList})`;
  const files = await db.select({ key: tracks.audioKey, preview: tracks.previewKey }).from(tracks).where(owned);
  await Promise.all(files.flatMap((f) => [f.key && deleteObject("masters", f.key), f.preview && deleteObject("previews", f.preview)]));
  await db.delete(tracks).where(owned);
  await db.delete(users).where(sql`${users.id} in (${idList})`);
}

/** The address a browser would use, with no credentials (path-style, as RustFS serves it). */
export function publicUrl(bucket: BucketName, key: string): string {
  return `${process.env.S3_ENDPOINT ?? "http://localhost:9000"}/${bucketId(bucket)}/${key}`;
}
