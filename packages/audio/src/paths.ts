import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FFMPEG_BUILDS, FFMPEG_RELEASE, type PlatformKey } from "./ffmpeg-release";

// Server/worker only: never import this package from browser or Next-bundled code.
// The default resolves from this file's location (repo-root .cache/ffmpeg, git-ignored);
// FERREL_FFMPEG_DIR overrides it, e.g. if the code is ever bundled or deployed elsewhere.
const base = process.env.FERREL_FFMPEG_DIR ?? fileURLToPath(new URL("../../../.cache/ffmpeg/", import.meta.url));

/** .cache/ffmpeg/<release>/ */
export const FFMPEG_CACHE_DIR = join(base, FFMPEG_RELEASE);

export function binaryPathFor(key: PlatformKey): string {
  return join(FFMPEG_CACHE_DIR, key, FFMPEG_BUILDS[key].file);
}
