// The one way this codebase runs FFmpeg on untrusted files (decisions 022–024):
// - an argument list, never a shell string, so file names are always plain text;
// - inputs restricted to local files (use `localInput`), so nothing reaches the network;
// - a time limit that kills the process;
// - output either streamed to a callback or buffered up to a cap.
import { spawn } from "node:child_process";
import { AudioToolError } from "./errors";
import { ffmpegPath } from "./ffmpeg-binary";

/** `-i <file>` restricted to the local file protocol. Put it before every input. */
export function localInput(file: string): string[] {
  return ["-protocol_whitelist", "file", "-i", file];
}

export type RunOptions = {
  /** Kill FFmpeg after this long. */
  timeoutMs?: number;
  /** Receive stdout as it arrives (nothing is buffered). */
  onStdout?: (chunk: Buffer) => void;
  /** When buffering stdout, stop FFmpeg if it produces more than this. */
  maxStdoutBytes?: number;
};

export type RunResult = { stdout: Buffer; stderr: string };

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
      if (onStdout) return onStdout(chunk);
      buffered += chunk.length;
      if (buffered > maxStdoutBytes) return stop(new AudioToolError("FAILED", `FFmpeg output exceeded ${maxStdoutBytes} bytes.`));
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 64_000) stderr += chunk.toString();
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
