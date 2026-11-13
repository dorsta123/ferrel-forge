// Phase 5 part 1: a visitor signs up from a release page, licenses the track at its locked
// rate, and both sides see the license.
import { newCreator, PASSWORD, testEmail } from "../helpers/accounts";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test } from "../helpers/fixtures";
import { main } from "../helpers/page";

test("sign up from a release page, license the track, and see it on both dashboards", async ({ open }) => {
  const artistPage = await open();
  const artist = await newCreator(artistPage, "Alice");
  const artistId = await userIdByEmail(artist.email);
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre, base_rate_micros, status, published_at, audio_key, audio_size_bytes, audio_format, audio_status)
    values (${artistId}, 'Midnight Run', 'midnight-run', 'electronic', 750000, 'published', now(), ${`${artistId}/x/a.wav`}, 10, 'wav', 'processing') returning id`;

  const page = await open();
  const m = main(page);
  const releaseUrl = `/creators/${artist.slug}/midnight-run`;

  await test.step("a signed-out visitor is sent to sign in, then signs up instead and comes straight back", async () => {
    await page.goto(releaseUrl);
    await m.getByRole("link", { name: "License this track" }).click();
    await page.waitForURL(/\/sign-in\?next=/);
    await page.waitForLoadState("networkidle");
    await m.getByRole("link", { name: "Sign up" }).click();
    await page.waitForURL(/\/sign-up\?next=/);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Name").fill("Brand Buyer");
    await page.getByLabel("Email").fill(testEmail("buyer"));
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(`**${releaseUrl}/license`);
  });

  await test.step("the license page shows the rate that will be locked, and asks for billing details once", async () => {
    await page.waitForLoadState("networkidle");
    await expect(m.getByTestId("license-rate")).toHaveText("$0.75");
    await m.getByRole("button", { name: "License this track" }).click();
    await expect(m.getByText("Choose at least one platform")).toBeVisible();
    await expect(m.getByText("Please agree to the license terms.")).toBeVisible();
  });

  await test.step("choosing platforms, cities and a term, and agreeing, licenses the track", async () => {
    await m.getByLabel("Instagram").check();
    await m.getByLabel("TikTok").check();
    await m.getByLabel("London").check();
    await m.getByLabel("Mumbai").check();
    await m.getByLabel("90 days").check();
    await m.getByLabel("Company or brand").fill("Acme Sneakers");
    await m.getByLabel("Billing country").selectOption("GB");
    await m.getByLabel("I agree to these license terms").check();
    await m.getByRole("button", { name: "License this track" }).click();
    await page.waitForURL(/\/licenses\?new=/);
  });

  await test.step("'My licenses' shows it with the locked rate", async () => {
    await expect(m.getByRole("status")).toContainText("Licensed");
    const card = m.getByTestId("license-card");
    await expect(card).toHaveCount(1);
    for (const text of ["Midnight Run", "Alice Music", "Instagram · TikTok", "London, Mumbai", "Active", "$0.75"]) await expect(card).toContainText(text);
  });

  await test.step("the artist sees it on their dashboard; their own track can't be licensed by them", async () => {
    await artistPage.goto("/dashboard");
    await expect(main(artistPage).getByText("Active licenses").locator("..")).toContainText("1");
    await expect(main(artistPage).getByTestId("row-licenses")).toHaveText(/1 active license/);
    await artistPage.goto(`${releaseUrl}/license`);
    await expect(main(artistPage).getByRole("alert")).toContainText("You can't license your own track.");
    expect((await sql`select count(*)::int as n from licenses where track_id = ${trackId}`)[0].n).toBe(1);
  });
});
