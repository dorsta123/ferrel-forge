import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { FFMPEG_BUILDS, FFMPEG_RELEASE, type PlatformKey } from "./ffmpeg-release";

/** Repo-root .cache/ffmpeg/<release>/<platform>/ (git-ignored). */
export const FFMPEG_CACHE_DIR = fileURLToPath(new URL(`../../../.cache/ffmpeg/${FFMPEG_RELEASE}/`, import.meta.url));

export function binaryPathFor(key: PlatformKey): string {
  return join(FFMPEG_CACHE_DIR, key, FFMPEG_BUILDS[key].file);
}
