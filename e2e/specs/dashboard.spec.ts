// The creator dashboard: empty state, release list, stats, filters, access.
import { gotoReady, newCreator } from "../helpers/accounts";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test, PHONE } from "../helpers/fixtures";
import { fitsWidth, main } from "../helpers/page";

const stat = (page: import("@playwright/test").Page, name: string) => main(page).getByTestId(`stat-${name}`).locator("span").nth(1);

test("the dashboard lists a creator's releases with real numbers", async ({ open }) => {
  const page = await open();
  const m = main(page);
  const rows = m.getByTestId("track-row");
  const alice = await newCreator(page, "Alice");
  const aliceId = await userIdByEmail(alice.email);
  let liveId = "";

  await test.step("a new creator sees the empty state and zero stats", async () => {
    await expect(m.getByText("No releases yet")).toBeVisible();
    for (const name of ["releases", "published", "copies-sold"]) await expect(stat(page, name)).toHaveText("0");
    await expect(m.getByText("Earnings")).toHaveCount(0);
  });

  await test.step("one release through the UI, two more in the database", async () => {
    await m.getByRole("link", { name: "Create your first release" }).click();
    await page.waitForURL("**/dashboard/tracks/new");
    await page.waitForLoadState("networkidle");
    await m.getByLabel("Title", { exact: true }).fill("Golden Hour");
    await m.getByLabel("Genre").selectOption("lo-fi");
    await m.getByRole("button", { name: "Create draft" }).click();
    await page.waitForURL(/\/dashboard\/tracks\/[0-9a-f-]{36}$/);
    const goldenId = page.url().split("/").pop()!;
    await sql`update tracks set updated_at = now() - interval '2 hours' where id = ${goldenId}`;
    [{ id: liveId }] = await sql<{ id: string }[]>`
      insert into tracks (creator_id, title, slug, genre, total_supply, base_price_cents, status, copies_sold, published_at, updated_at, audio_key, audio_size_bytes, audio_format)
      values (${aliceId}, 'Midnight Run', 'midnight-run', 'electronic', 50, 1250, 'published', 2, now(), now() - interval '5 minutes', ${`${aliceId}/x/a.wav`}, 10, 'wav')
      returning id`;
    await sql`
      insert into tracks (creator_id, title, slug, genre, total_supply, base_price_cents, status, copies_sold, published_at, updated_at, audio_key, audio_size_bytes, audio_format)
      values (${aliceId}, 'Old Tape', 'old-tape', 'ambient', 10, 500, 'archived', 10, now(), now() - interval '3 days', ${`${aliceId}/x/b.wav`}, 10, 'wav')`;
    await m.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL("/dashboard");
  });

  await test.step("all three are listed, newest-edited first, with real stats", async () => {
    await expect(rows.locator("p.truncate")).toHaveText(["Midnight Run", "Golden Hour", "Old Tape"]);
    await expect(stat(page, "releases")).toHaveText("3");
    await expect(stat(page, "published")).toHaveText("1");
    await expect(stat(page, "copies-sold")).toHaveText("12");
  });

  await test.step("each row shows status, price, copies, edit time and warnings", async () => {
    const live = rows.filter({ hasText: "Midnight Run" });
    for (const text of ["Published", "$13.00", "48 of 50 left", "edited 5m ago"]) await expect(live).toContainText(text);
    await expect(rows.filter({ hasText: "Golden Hour" })).toContainText("Needs audio");
    await expect(rows.filter({ hasText: "Golden Hour" })).toContainText("edited 2h ago");
    await expect(rows.filter({ hasText: "Old Tape" })).toContainText("Sold out");
  });

  await test.step("filter tabs show counts and filter the list", async () => {
    const tabs = m.getByRole("navigation", { name: "Filter releases" });
    await expect(tabs).toHaveText(/All\s*3\s*Drafts\s*1\s*Published\s*1\s*Archived\s*1/);
    await tabs.getByRole("link", { name: /Drafts/ }).click();
    await page.waitForURL("**/dashboard?status=draft");
    await expect(rows).toHaveText([/Golden Hour/]);
    await expect(tabs.getByRole("link", { name: /Drafts/ })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: /Archived/ }).click();
    await page.waitForURL("**/dashboard?status=archived");
    await expect(rows).toHaveText([/Old Tape/]);
    await page.goto("/dashboard?status=bogus'--");
    await expect(rows).toHaveCount(3);
  });

  await test.step("clicking a row opens its editor", async () => {
    await rows.filter({ hasText: "Midnight Run" }).click();
    await page.waitForURL(`**/dashboard/tracks/${liveId}`);
    await expect(m.getByRole("heading", { name: "Midnight Run", level: 1 })).toBeVisible();
  });

  await test.step("another creator sees none of it, and gets an empty-filter message", async () => {
    const bob = await open();
    const bobAccount = await newCreator(bob, "Bob");
    await expect(main(bob).getByText("No releases yet")).toBeVisible();
    await expect(main(bob).getByText("Midnight Run")).toHaveCount(0);
    const bobId = await userIdByEmail(bobAccount.email);
    await sql`insert into tracks (creator_id, title, slug, genre, total_supply, base_price_cents) values (${bobId}, 'Bob Demo', 'bob-demo', 'rock', 5, 300)`;
    await gotoReady(bob, "/dashboard?status=published");
    await expect(main(bob).getByText("No published releases.")).toBeVisible();
  });

  await test.step("the list fits a phone in the light theme", async () => {
    const phone = await open({ viewport: PHONE, theme: "light", as: page });
    await phone.goto("/dashboard");
    await expect(main(phone).getByTestId("track-row").first()).toBeVisible();
    expect(await fitsWidth(phone)).toBe(true);
  });
});
