import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Worker integration tests: real Postgres, RustFS and FFmpeg (`pnpm db:up`, `pnpm audio:fetch`).
// Settings come from the root .env, unless already set in the environment (e.g. CI).
if (!process.env.DATABASE_URL) process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    env: { QUEUE_PREFIX: "ferrel-test" },
  },
});
