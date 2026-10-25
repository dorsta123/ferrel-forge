// `pnpm audio:fetch`: put the pinned FFmpeg build in .cache/ffmpeg, verified (decision 024).
// Skips the download when a verified copy is already there (CI caches the folder).
// Each attempt downloads, unpacks and checks the SHA-256 before anything is installed;
// a stalled or cut-off download is retried, a missing asset (404) fails at once.
import { chmodSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { gunzipSync } from "node:zlib";
import { FFMPEG_BUILDS, FFMPEG_RELEASE, downloadUrl, platformKey } from "../src/ffmpeg-release";
import { binaryPathFor } from "../src/paths";
import { sha256File } from "../src/sha256";

const STALL_MS = 60_000; // abort an attempt if no bytes arrive for a minute
const ATTEMPTS = 5;

class PermanentError extends Error {}

const key = platformKey();
if (!key) {
  console.error(`No pinned FFmpeg build for ${process.platform}-${process.arch}. Supported: ${Object.keys(FFMPEG_BUILDS).join(", ")}.`);
  process.exit(1);
}
const target = binaryPathFor(key);
const expected = FFMPEG_BUILDS[key].sha256;

if (existsSync(target) && (await sha256File(target)) === expected) {
  console.log(`FFmpeg ${FFMPEG_RELEASE} (${key}) already present and verified.`);
  process.exit(0);
}

const url = downloadUrl(key);
mkdirSync(dirname(target), { recursive: true });
const temp = `${target}.download`;

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    console.log(`Downloading ${url} (attempt ${attempt}/${ATTEMPTS})…`);
    // Unpack and verify inside the attempt: a truncated or corrupted download is retried.
    writeFileSync(temp, gunzipSync(await download(url)));
    const actual = await sha256File(temp);
    if (actual !== expected) throw new Error(`SHA-256 mismatch (expected ${expected}, got ${actual})`);
    chmodSync(temp, 0o755);
    renameSync(temp, target);
    console.log(`FFmpeg ${FFMPEG_RELEASE} (${key}) installed and verified at ${target}`);
    process.exit(0);
  } catch (err) {
    rmSync(temp, { force: true });
    console.warn(`  failed: ${(err as Error).message}`);
    if (err instanceof PermanentError) break;
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 3_000 * attempt));
  }
}
console.error("Could not install FFmpeg. Check the connection (or the pinned release) and run `pnpm audio:fetch` again.");
process.exit(1);

/** Fetch the whole file, aborting if the stream goes quiet for STALL_MS. */
async function download(from: string): Promise<Buffer> {
  const controller = new AbortController();
  let stall = setTimeout(() => controller.abort(new Error("download stalled")), STALL_MS);
  try {
    const res = await fetch(from, { signal: controller.signal, redirect: "follow" });
    if (res.status >= 400 && res.status < 500) throw new PermanentError(`HTTP ${res.status} for ${from}`);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.body) {
      chunks.push(chunk);
      clearTimeout(stall);
      stall = setTimeout(() => controller.abort(new Error("download stalled")), STALL_MS);
    }
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(stall);
  }
}
