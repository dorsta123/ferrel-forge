// Becoming a creator: access rules, slug suggestions and validation, the dashboard.
import { PASSWORD, gotoReady, signUp, testEmail, testSlug } from "../helpers/accounts";
import { expect, test, PHONE } from "../helpers/fixtures";
import { fitsWidth, main } from "../helpers/page";

test("signed-out visitors are sent to sign in", async ({ open }) => {
  const page = await open();
  await page.goto("/become-creator");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("a buyer becomes a creator", async ({ open }) => {
  const page = await open({ viewport: { width: 1100, height: 800 } });
  const header = page.locator("header");
  const alerts = page.locator("form").getByRole("alert");
  const email = testEmail("alice");
  const slug = testSlug("ferrel");
  await signUp(page, { name: "Alice", email });

  await test.step("buyers see 'Become a creator', and the dashboard says it's for creators", async () => {
    await expect(header.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await page.goto("/dashboard");
    await expect(main(page).getByText("This page is for creators")).toBeVisible();
    await page.goto("/");
    await header.getByRole("link", { name: "Become a creator" }).click();
    await page.waitForURL("**/become-creator");
    await page.waitForLoadState("networkidle");
  });

  await test.step("the URL is suggested from the artist name", async () => {
    await page.getByLabel("Artist name").pressSequentially("Björk & Friends!");
    await expect(page.getByLabel("Profile URL")).toHaveValue("bjork-friends");
    await expect(page.locator("#slug-preview")).toContainText("creators/bjork-friends");
  });

  await test.step("reserved and too-short URLs are refused, keeping what was typed", async () => {
    await page.getByLabel("Profile URL").fill("dashboard");
    await page.getByRole("button", { name: "Become a creator" }).click();
    await expect(alerts).toHaveText(["That URL is reserved. Try another."]);
    await expect(page.getByLabel("Artist name")).toHaveValue("Björk & Friends!");

    await page.getByLabel("Profile URL").fill("ab");
    await page.getByRole("button", { name: "Become a creator" }).click();
    await expect(alerts).toHaveText(["Use 3–30 characters."]);
  });

  await test.step("editing the URL clears its error and stops suggestions", async () => {
    await page.getByLabel("Profile URL").fill(slug);
    await expect(alerts).toHaveCount(0);
    await page.getByLabel("Artist name").fill("");
    await page.getByLabel("Artist name").pressSequentially("DJ Ferrel");
    await expect(page.getByLabel("Profile URL")).toHaveValue(slug);
  });

  await test.step("success opens the dashboard", async () => {
    await page.getByLabel("Bio").fill("Beats from the forge.");
    await page.getByRole("button", { name: "Become a creator" }).click();
    await page.waitForURL("/dashboard");
    await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Become a creator" })).toHaveCount(0);
    await expect(main(page).getByRole("heading", { name: "DJ Ferrel" })).toBeVisible();
    await expect(main(page).getByText(`ferrel-forge.com/creators/${slug}`).first()).toBeVisible();
    await expect(main(page).getByText("Beats from the forge.")).toBeVisible();
  });

  await test.step("the header's Dashboard link works, and creators can't reopen the form", async () => {
    await page.goto("/");
    await header.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/become-creator");
    await expect(page).toHaveURL("/dashboard");
  });

  await test.step("another user can't take the same URL", async () => {
    const bob = await open();
    await signUp(bob, { name: "Bob", email: testEmail("bob") });
    await gotoReady(bob, "/become-creator");
    await bob.getByLabel("Artist name").fill("DJ Ferrel");
    await bob.getByLabel("Profile URL").fill(slug);
    await bob.getByRole("button", { name: "Become a creator" }).click();
    await expect(bob.locator("form").getByRole("alert")).toHaveText(["That URL is taken. Try another."]);
  });

  await test.step("header and dashboard fit on a phone", async () => {
    const phone = await open({ viewport: PHONE });
    await gotoReady(phone, "/sign-in");
    await phone.getByLabel("Email").fill(email);
    await phone.getByLabel("Password").fill(PASSWORD);
    await phone.getByRole("button", { name: "Sign in" }).click();
    await phone.waitForURL("/");
    await expect(phone.locator("header").getByRole("button", { name: "Account menu" })).toBeVisible();
    expect(await fitsWidth(phone)).toBe(true);
    await phone.goto("/dashboard");
    await expect(main(phone).getByRole("heading", { name: "DJ Ferrel" })).toBeVisible();
    expect(await fitsWidth(phone)).toBe(true);
  });
});
