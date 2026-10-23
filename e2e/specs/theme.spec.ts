// Theme toggle and reduced motion.
import { expect, test } from "../helpers/fixtures";

const isDark = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.classList.contains("dark"));

test("the theme defaults to dark, toggles, and is remembered", async ({ open }) => {
  const page = await open({ theme: null, viewport: { width: 1280, height: 800 } });
  const toggle = page.getByRole("button", { name: "Toggle light and dark theme" });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(await isDark(page)).toBe(true);

  await toggle.click();
  await expect.poll(() => isDark(page)).toBe(false);
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(await isDark(page)).toBe(false);

  await toggle.click();
  await expect.poll(() => isDark(page)).toBe(true);
});

test("reduced motion stops the waveform animation", async ({ open }) => {
  const page = await open({ reducedMotion: "reduce" });
  await page.goto("/");
  const duration = await page.locator(".animate-eq").first().evaluate((e) => getComputedStyle(e).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.01);
});
