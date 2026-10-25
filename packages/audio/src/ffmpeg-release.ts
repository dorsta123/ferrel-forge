// Which FFmpeg we use, pinned (decisions 022, 023, 024). These are the builds
// published in the ffmpeg-static project's GitHub release. We download them
// ourselves and refuse any file whose SHA-256 differs from the one recorded here.
//
// To upgrade: change the release, run `pnpm audio:fetch` on each platform to get
// the new hashes from the official assets, update them below, and open a PR.

export const FFMPEG_RELEASE = "b6.1.1";

export const FFMPEG_BUILDS = {
  // gyan.dev "essentials" build, FFmpeg 6.1.1 (development on Windows)
  "win32-x64": { file: "ffmpeg.exe", sha256: "04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00" },
  // johnvansickle.com static build, FFmpeg 7.0.2 (CI and servers: the reference, decision 023)
  "linux-x64": { file: "ffmpeg", sha256: "e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99" },
} as const;

export type PlatformKey = keyof typeof FFMPEG_BUILDS;

/** "win32-x64", "linux-x64", or null when we have no pinned build for this machine. */
export function platformKey(platform: string = process.platform, arch: string = process.arch): PlatformKey | null {
  const key = `${platform}-${arch}`;
  return key in FFMPEG_BUILDS ? (key as PlatformKey) : null;
}

export function downloadUrl(key: PlatformKey): string {
  return `https://github.com/eugeneware/ffmpeg-static/releases/download/${FFMPEG_RELEASE}/ffmpeg-${key}.gz`;
}
