import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests: real Postgres + RustFS (run `pnpm db:up` first). They call
// services and queries directly with forged input. Kept apart from the fast unit
// tests in vitest.config.ts. Files run one at a time because they share the database.
process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    env: { ...(process.env as Record<string, string>) },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
