import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests: real Postgres + RustFS (run `pnpm db:up` first). They call
// services and queries directly with forged input. Kept apart from the fast unit
// tests in vitest.config.ts. Files run one at a time because they share the database.
// Settings come from the root .env, unless already set in the environment (e.g. CI).
if (!process.env.DATABASE_URL) process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Queue tickets go under a test-only prefix, out of reach of a running dev worker.
    env: { QUEUE_PREFIX: "ferrel-test" },
  },
});
