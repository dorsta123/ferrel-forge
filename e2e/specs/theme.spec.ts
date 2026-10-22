// Theme toggle, the homepage pricing demo, and reduced motion.
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

test("the homepage price demo runs the real pricing engine", async ({ open }) => {
  const page = await open({ viewport: { width: 1280, height: 800 } });
  await page.goto("/");
  await page.waitForLoadState("networkidle"); // the slider only responds once React has loaded
  const how = page.locator("#how");
  const price = how.getByText(/^\$\d+\.\d{2}$/).first();
  const slider = how.getByRole("slider", { name: "Copies sold" });

  await expect(price).toHaveText("$15.00"); // 50 of 100 sold
  await slider.fill("0");
  await expect(price).toHaveText("$10.00");
  await slider.fill("99");
  await expect(price).toHaveText("$19.90");
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(price).toHaveText("$19.80");

  await how.locator("svg[role=img]").hover({ position: { x: 200, y: 120 } });
  await expect(how.getByText(/^after \d+ sold$/)).toBeVisible();
});

test("reduced motion stops the waveform animation", async ({ open }) => {
  const page = await open({ reducedMotion: "reduce" });
  await page.goto("/");
  const duration = await page.locator(".animate-eq").first().evaluate((e) => getComputedStyle(e).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.01);
});
