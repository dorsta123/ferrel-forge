// Test-only helpers: generate real audio files with FFmpeg's built-in sources,
// in a temporary folder whose name contains spaces (like "Claude Project").
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFfmpeg } from "./run-ffmpeg";

export function makeTempDir(): { dir: string; file: (name: string) => string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "ferrel audio test "));
  return { dir, file: (name) => join(dir, name), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** A sine tone (or silence) of the given length, written to `out` in the format its extension implies. */
export async function generate(out: string, opts: { seconds: number; volume?: number; silent?: boolean; extra?: string[] }) {
  const source = opts.silent
    ? ["-f", "lavfi", "-i", `anullsrc=r=44100:cl=stereo`, "-t", String(opts.seconds)]
    : ["-f", "lavfi", "-i", `sine=frequency=220:sample_rate=44100:duration=${opts.seconds}`, "-ac", "2"];
  const volume = opts.volume !== undefined ? ["-af", `volume=${opts.volume}`] : [];
  await runFfmpeg(["-y", ...source, ...volume, ...(opts.extra ?? []), out]);
}
