// Sign up, sign out, sign in, and their validation messages.
import { PASSWORD, gotoReady, signUp, testEmail } from "../helpers/accounts";
import { expect, test, PHONE } from "../helpers/fixtures";
import { fitsWidth } from "../helpers/page";

test("a visitor signs up, signs out and signs back in", async ({ open }) => {
  // The wrong-password attempt below answers 401, which the browser logs as an error.
  const page = await open({ viewport: { width: 1100, height: 750 }, allow: [/status of 401/] });
  const header = page.locator("header");
  const alert = page.locator("form").getByRole("alert");
  const email = testEmail("auth");

  await test.step("logged-out header offers Sign in and Sign up", async () => {
    await page.goto("/");
    await expect(header.getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sign in" })).toHaveCount(1);
  });

  await test.step("sign-up rejects a short password and mismatched passwords", async () => {
    await header.getByRole("link", { name: "Sign up" }).click();
    await page.waitForURL("**/sign-up");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Name").fill("E2E Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByLabel("Confirm password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(alert).toHaveText("Password must be at least 8 characters.");

    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD + "x");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(alert).toHaveText("Passwords don't match.");
  });

  await test.step("a valid sign-up signs the user in", async () => {
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/");
    await expect(header.getByText("E2E Tester")).toBeVisible();
    await expect(header.getByRole("button", { name: "Account menu" })).toHaveCount(1);
  });

  await test.step("signed-in users visiting /sign-in go home", async () => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL("/");
  });

  await test.step("sign out returns the header to its logged-out state", async () => {
    await header.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(header.getByText("E2E Tester")).toHaveCount(0);
  });

  await test.step("sign-in rejects a wrong password, then accepts the right one (email case-insensitive)", async () => {
    await header.getByRole("link", { name: "Sign in" }).click();
    await page.waitForURL("**/sign-in");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(email.toUpperCase());
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(alert).toHaveText("Invalid email or password.");

    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
    await expect(header.getByText("E2E Tester")).toBeVisible();
  });
});

test("an email can only be registered once", async ({ open }) => {
  const email = testEmail("dup");
  await signUp(await open(), { name: "First", email });

  // The server refuses the duplicate with 422, which the browser logs as an error.
  const second = await open({ allow: [/status of 422/] });
  await gotoReady(second, "/sign-up");
  await second.getByLabel("Name").fill("Dup");
  await second.getByLabel("Email").fill(email);
  await second.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await second.getByLabel("Confirm password").fill(PASSWORD);
  await second.getByRole("button", { name: "Create account" }).click();
  await expect(second.locator("form").getByRole("alert")).toHaveText("That email is already registered. Try signing in.");
});

test("sign-up fits on a phone", async ({ open }) => {
  const page = await open({ viewport: PHONE });
  await page.goto("/sign-up");
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
});
