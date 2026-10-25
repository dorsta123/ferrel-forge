import { defineConfig } from "vitest/config";

// These tests run the real FFmpeg (fetched by `pnpm audio:fetch`) on generated audio.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 60_000 },
});
