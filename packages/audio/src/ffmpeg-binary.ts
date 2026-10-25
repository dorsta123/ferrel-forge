import { existsSync } from "node:fs";
import { AudioToolError } from "./errors";
import { FFMPEG_BUILDS, platformKey, type PlatformKey } from "./ffmpeg-release";
import { binaryPathFor } from "./paths";
import { sha256File } from "./sha256";

/** Where the pinned FFmpeg for a machine lives, and its expected fingerprint. */
export function resolveBinary(platform: string = process.platform, arch: string = process.arch): { key: PlatformKey; path: string; sha256: string } {
  const key = platformKey(platform, arch);
  if (!key) {
    throw new AudioToolError("UNSUPPORTED_PLATFORM", `No pinned FFmpeg build for ${platform}-${arch}. Supported: ${Object.keys(FFMPEG_BUILDS).join(", ")}.`);
  }
  return { key, path: binaryPathFor(key), sha256: FFMPEG_BUILDS[key].sha256 };
}

/** Refuse a missing file, or one whose SHA-256 isn't the pinned one (tampered or corrupted). */
export async function verifyBinary(path: string, expectedSha256: string): Promise<void> {
  if (!existsSync(path)) {
    throw new AudioToolError("FFMPEG_MISSING", `FFmpeg isn't installed (${path}). Run \`pnpm audio:fetch\`.`);
  }
  const actual = await sha256File(path);
  if (actual !== expectedSha256) {
    throw new AudioToolError("FFMPEG_TAMPERED", `FFmpeg at ${path} doesn't match its pinned SHA-256 (got ${actual}). Delete it and run \`pnpm audio:fetch\`.`);
  }
}

let verified: Promise<string> | null = null;

/** Path to this machine's FFmpeg, fingerprint-checked once per process. */
export function ffmpegPath(): Promise<string> {
  verified ??= (async () => {
    const binary = resolveBinary();
    await verifyBinary(binary.path, binary.sha256);
    return binary.path;
  })().catch((err: unknown) => {
    verified = null; // let a later call retry, e.g. after `pnpm audio:fetch`
    throw err;
  });
  return verified;
}
