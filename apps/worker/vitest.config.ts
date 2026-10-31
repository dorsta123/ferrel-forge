import { defineConfig } from "vitest/config";

// Unit tests: fast, no services. Integration tests use vitest.integration.config.ts.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
