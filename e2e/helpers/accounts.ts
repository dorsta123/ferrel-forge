// Creating test accounts through the real UI.
import { randomBytes } from "node:crypto";
import type { Page } from "@playwright/test";
import { BASE_URL } from "./env";

export const PASSWORD = "e2e-password-123";

const token = () => randomBytes(3).toString("hex");

/** e2e.<label>.<random>@example.com: matches the cleanup pattern. */
export const testEmail = (label: string) => `e2e.${label.toLowerCase()}.${Date.now().toString(36)}${token()}@example.com`;

/** A creator slug that's unique per run and within the 30-character limit. */
export const testSlug = (label: string) => `e2e-${label.toLowerCase()}-${token()}`.slice(0, 30);

/** Wait for the page's JavaScript before typing, or React discards early input. */
export async function gotoReady(page: Page, path: string) {
  await page.goto(BASE_URL + path);
  await page.waitForLoadState("networkidle");
}

export async function signUp(page: Page, { name, email, password = PASSWORD }: { name: string; email: string; password?: string }) {
  await gotoReady(page, "/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(BASE_URL + "/");
}

export async function becomeCreator(page: Page, { artistName, slug, bio }: { artistName: string; slug: string; bio?: string }) {
  await gotoReady(page, "/become-creator");
  await page.getByLabel("Artist name").fill(artistName);
  await page.getByLabel("Profile URL").fill(slug);
  if (bio) await page.getByLabel("Bio").fill(bio);
  await page.getByRole("button", { name: "Become a creator" }).click();
  await page.waitForURL(BASE_URL + "/dashboard");
}

/** Sign up and become a creator in one go. */
export async function newCreator(page: Page, label: string, extra: { bio?: string } = {}) {
  const email = testEmail(label);
  const slug = testSlug(label);
  await signUp(page, { name: label, email });
  await becomeCreator(page, { artistName: `${label} Music`, slug, ...extra });
  return { email, slug, artistName: `${label} Music` };
}
