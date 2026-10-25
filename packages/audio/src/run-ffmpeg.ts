// The one way this codebase runs FFmpeg on untrusted files (decisions 022–024):
// - an argument list, never a shell string, so file names are always plain text;
// - every input via `localInput(file, format)`: local files only AND an explicit
//   format, so a file can't act as a playlist/concat script that makes FFmpeg read
//   other files (reviewed and proven in phase 4 slice 2);
// - a time limit that kills the process;
// - output either streamed to a callback or buffered up to a cap.
import { spawn } from "node:child_process";
import { AudioToolError } from "./errors";
import { ffmpegPath } from "./ffmpeg-binary";

/** The upload formats we accept, and FFmpeg's matching demuxer. */
export const INPUT_FORMATS = { wav: "wav", mp3: "mp3", flac: "flac" } as const;
export type InputFormat = keyof typeof INPUT_FORMATS;

/**
 * `-i <file>` for an untrusted file: the local file protocol only, and the exact
 * demuxer for its (already byte-checked) format, so FFmpeg never guesses.
 */
export function localInput(file: string, format: InputFormat): string[] {
  return ["-protocol_whitelist", "file", "-f", INPUT_FORMATS[format], "-i", file];
}

export type RunOptions = {
  /** Kill FFmpeg after this long. */
  timeoutMs?: number;
  /** Receive stdout as it arrives (nothing is buffered). If it throws, FFmpeg is stopped. */
  onStdout?: (chunk: Buffer) => void;
  /** When buffering stdout, stop FFmpeg if it produces more than this. */
  maxStdoutBytes?: number;
};

export type RunResult = { stdout: Buffer; stderr: string };

const STDERR_TAIL = 16_000; // keep the end of the log: that's where the real error is

export async function runFfmpeg(args: readonly string[], options: RunOptions = {}): Promise<RunResult> {
  const { timeoutMs = 60_000, onStdout, maxStdoutBytes = 16 * 1024 * 1024 } = options;
  const binary = await ffmpegPath();

  return new Promise<RunResult>((resolve, reject) => {
    const child = spawn(binary, ["-nostdin", "-hide_banner", "-loglevel", "error", ...args], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let buffered = 0;
    let stderr = "";
    let stopped: AudioToolError | null = null;
    let settled = false;

    const stop = (reason: AudioToolError) => {
      stopped ??= reason;
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => stop(new AudioToolError("TIMEOUT", `FFmpeg was stopped after ${timeoutMs} ms.`)), timeoutMs);

    const finish = (err: AudioToolError | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve({ stdout: Buffer.concat(chunks), stderr });
    };

    child.stdout.on("data", (chunk: Buffer) => {
      if (stopped) return;
      if (onStdout) {
        try {
          onStdout(chunk);
        } catch (err) {
          stop(new AudioToolError("FAILED", `Processing FFmpeg output failed: ${(err as Error).message}`));
        }
        return;
      }
      buffered += chunk.length;
      if (buffered > maxStdoutBytes) return stop(new AudioToolError("FAILED", `FFmpeg output exceeded ${maxStdoutBytes} bytes.`));
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL);
    });
    child.on("error", (err) => finish(new AudioToolError("FAILED", `Couldn't start FFmpeg: ${err.message}`)));
    child.on("close", (code) => {
      if (stopped) return finish(stopped);
      if (code !== 0) return finish(new AudioToolError("FAILED", summarize(stderr) || `FFmpeg exited with code ${code}.`));
      finish(null);
    });
  });
}

/** The last few error lines, which say what went wrong. */
function summarize(stderr: string): string {
  return stderr.trim().split(/\r?\n/).filter(Boolean).slice(-3).join(" | ");
}
