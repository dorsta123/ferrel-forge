import { defineConfig } from "@playwright/test";
import { BASE_URL } from "./helpers/env";

// Browser tests against the real app. Needs Docker services (`pnpm db:up`).
// Uses the dev server if one is running, otherwise starts it.
// One worker: tests share one database, and some count what's public.
export default defineConfig({
  testDir: "./specs",
  workers: 1,
  fullyParallel: false,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    channel: "chrome", // the installed Google Chrome: no browser download
    headless: true,
    screenshot: { mode: "only-on-failure" },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm --filter @ferrel/web dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
