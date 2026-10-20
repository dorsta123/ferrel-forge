import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests only (no database or storage). Mirrors the "@/…" path alias from tsconfig.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
