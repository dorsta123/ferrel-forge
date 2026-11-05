// Run the real worker for a browser test, then stop it. Started as one Node process
// (`node --import tsx`, not `pnpm`/`tsx` wrappers) so stopping it really stops it, on Windows too.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const WORKER_DIR = fileURLToPath(new URL("../../apps/worker/", import.meta.url));

/** Starts the worker and resolves once it's listening; call the returned function to stop it. */
export async function startWorker(): Promise<() => Promise<void>> {
  const child = spawn(process.execPath, ["--env-file=../../.env", "--import", "tsx", "src/index.ts"], {
    cwd: WORKER_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`The worker didn't start within 60 s:\n${log}`)), 60_000);
    const read = (chunk: Buffer) => {
      log += chunk.toString();
      if (log.includes("Worker started")) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on("data", read);
    child.stderr.on("data", read);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`The worker exited (${code}):\n${log}`));
    });
  });
  await ready;
  return async () => {
    if (child.exitCode !== null) return;
    child.kill();
    await once(child, "exit");
  };
}
