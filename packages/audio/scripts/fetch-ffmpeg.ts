// `pnpm audio:fetch`: put the pinned FFmpeg build in .cache/ffmpeg, verified.
// Skips the download when a verified copy is already there (CI caches the folder).
// Unlike ffmpeg-static's installer it has a stall timeout and retries, and it
// refuses any file whose SHA-256 doesn't match the pinned one.
import { chmodSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { gunzipSync } from "node:zlib";
import { FFMPEG_BUILDS, FFMPEG_RELEASE, downloadUrl, platformKey } from "../src/ffmpeg-release";
import { binaryPathFor } from "../src/paths";
import { sha256File } from "../src/sha256";

const STALL_MS = 60_000; // abort an attempt if no bytes arrive for a minute
const ATTEMPTS = 5;

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
let gz: Buffer | null = null;
for (let attempt = 1; attempt <= ATTEMPTS && !gz; attempt++) {
  try {
    console.log(`Downloading ${url} (attempt ${attempt}/${ATTEMPTS})…`);
    gz = await download(url);
  } catch (err) {
    console.warn(`  failed: ${(err as Error).message}`);
    await new Promise((r) => setTimeout(r, 3_000 * attempt));
  }
}
if (!gz) {
  console.error("Could not download FFmpeg. Check the connection and run `pnpm audio:fetch` again.");
  process.exit(1);
}

// Write to a temporary name, verify, then move into place: a bad file never sits at the real path.
mkdirSync(dirname(target), { recursive: true });
const temp = `${target}.download`;
writeFileSync(temp, gunzipSync(gz));
const actual = await sha256File(temp);
if (actual !== expected) {
  rmSync(temp, { force: true });
  console.error(`SHA-256 mismatch for FFmpeg ${FFMPEG_RELEASE} (${key}).\n  expected ${expected}\n  got      ${actual}\nRefusing to install it.`);
  process.exit(1);
}
chmodSync(temp, 0o755);
renameSync(temp, target);
console.log(`FFmpeg ${FFMPEG_RELEASE} (${key}) installed and verified at ${target}`);

/** Fetch the whole file, aborting if the stream goes quiet for STALL_MS. */
async function download(from: string): Promise<Buffer> {
  const controller = new AbortController();
  let stall = setTimeout(() => controller.abort(new Error("download stalled")), STALL_MS);
  try {
    const res = await fetch(from, { signal: controller.signal, redirect: "follow" });
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
