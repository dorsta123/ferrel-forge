// Phase 5 part 3: the lead artist splits a track, a contributor signs up from the invite link and
// accepts, an advertiser licenses it, then the split changes and the license keeps the old one.
import { newCreator, PASSWORD, signUp, testEmail } from "../helpers/accounts";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test } from "../helpers/fixtures";
import { main } from "../helpers/page";

test("split a track, a contributor accepts from the link, license it, change the split", async ({ open }) => {
  const artistPage = await open();
  const artist = await newCreator(artistPage, "Alice");
  const artistId = await userIdByEmail(artist.email);
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre, status, published_at, audio_key, audio_size_bytes, audio_format, audio_status)
    values (${artistId}, 'Team Song', 'team-song', 'pop', 'published', now(), ${`${artistId}/x/a.wav`}, 10, 'wav', 'processing') returning id`;
  const a = main(artistPage);
  const releaseUrl = `/creators/${artist.slug}/team-song`;
  let inviteLink = "";

  await test.step("the artist splits the track 70/30 with Sam and gets Sam's invite link", async () => {
    await artistPage.goto(`/dashboard/tracks/${trackId}`);
    await artistPage.waitForLoadState("networkidle");
    await expect(a.getByTestId("split-total")).toHaveText("Total 100%");
    await a.getByRole("button", { name: "Add contributor" }).click();
    const sam = a.getByTestId("split-row").nth(1);
    await sam.getByLabel("Name").fill("Sam");
    await sam.getByLabel("Share %").fill("30");
    await expect(a.getByTestId("split-total")).toContainText("130%");
    await a.getByTestId("split-row").nth(0).getByLabel("Share %").fill("70");
    await expect(a.getByTestId("split-total")).toHaveText("Total 100%");
    await a.getByRole("button", { name: "Save split" }).click();
    await expect(a.getByTestId("split-status")).toContainText("1 of 2 accepted");
    await a.getByRole("button", { name: "Get invite link" }).click();
    inviteLink = await a.getByLabel("Invite link for Sam").inputValue();
    expect(inviteLink).toMatch(/\/splits\/invite\/[A-Za-z0-9_-]{43}$/);
  });

  await test.step("until Sam accepts, the track can't be licensed", async () => {
    const visitor = await open();
    await visitor.goto(releaseUrl);
    await expect(main(visitor).getByTestId("license-panel")).toContainText("Not yet available to license");
  });

  const samPage = await open();
  const s = main(samPage);
  await test.step("Sam opens the link, signs up, comes back and accepts 30%", async () => {
    await samPage.goto(inviteLink);
    await samPage.waitForURL(/\/sign-in\?next=/);
    await samPage.waitForLoadState("networkidle");
    await s.getByRole("link", { name: "Sign up" }).click();
    await samPage.waitForURL(/\/sign-up\?next=/);
    await samPage.waitForLoadState("networkidle");
    await samPage.getByLabel("Name").fill("Sam Singer");
    await samPage.getByLabel("Email").fill(testEmail("sam"));
    await samPage.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await samPage.getByLabel("Confirm password").fill(PASSWORD);
    await samPage.getByRole("button", { name: "Create account" }).click();
    await samPage.waitForURL(/\/splits\/invite\//);
    await samPage.waitForLoadState("networkidle");
    await expect(s.getByTestId("invite-share")).toHaveText("30%");
    await expect(s.getByTestId("split-table")).toContainText("Alice Music");
    await s.getByRole("button", { name: "Accept my share" }).click();
    await samPage.waitForURL("**/splits");
    await expect(s.getByTestId("my-split")).toContainText("Team Song");
    await expect(s.getByTestId("my-split")).toContainText("Accepted");
  });

  await test.step("the used link no longer works", async () => {
    await samPage.goto(inviteLink);
    await expect(s.getByRole("alert")).toContainText("expired or was already used");
  });

  let licenseId = "";
  await test.step("now an advertiser can license it, locking split version 1", async () => {
    const buyerPage = await open();
    const b = main(buyerPage);
    const email = testEmail("buyer");
    await signUp(buyerPage, { name: "Brand Buyer", email });
    await sql`insert into payment_cards (user_id, provider, brand, last4) values (${await userIdByEmail(email)}, 'simulated', 'visa', '4242')`;
    await buyerPage.goto(`${releaseUrl}/license`);
    await buyerPage.waitForLoadState("networkidle");
    await b.getByLabel("TikTok").check();
    await b.getByLabel("London").check();
    await b.getByLabel("Company or brand").fill("Acme");
    await b.getByLabel("Billing country").selectOption("GB");
    await b.getByLabel("I agree to these license terms").check();
    await b.getByRole("button", { name: "License this track" }).click();
    await buyerPage.waitForURL(/\/licenses\?new=/);
    licenseId = new URL(buyerPage.url()).searchParams.get("new")!;
    const [l] = await sql<{ version: number }[]>`select v.version from licenses l join split_versions v on v.id = l.split_version_id where l.id = ${licenseId}`;
    expect(l.version).toBe(1);
  });

  await test.step("the artist changes the split: Sam answers again from 'My splits'; the license keeps version 1", async () => {
    await artistPage.reload();
    await artistPage.waitForLoadState("networkidle");
    await a.getByTestId("split-row").nth(0).getByLabel("Share %").fill("60");
    await a.getByTestId("split-row").nth(1).getByLabel("Share %").fill("40");
    await a.getByRole("button", { name: "Save split" }).click();
    await expect(a.getByTestId("split-status")).toContainText("1 of 2 accepted");
    await expect(a.getByTestId("split-status")).toContainText("version 2");

    await samPage.goto("/splits");
    await expect(s.getByTestId("my-split")).toContainText("40%");
    await s.getByRole("button", { name: "Accept my share" }).click();
    await expect(s.getByTestId("my-split")).toContainText("Accepted");

    const [l] = await sql<{ version: number }[]>`select v.version from licenses l join split_versions v on v.id = l.split_version_id where l.id = ${licenseId}`;
    expect(l.version).toBe(1);
    const shares = await sql<{ basis_points: number }[]>`
      select s.basis_points from split_shares s join split_versions v on v.id = s.split_version_id
      where v.track_id = ${trackId} and v.version = 1 order by s.position`;
    expect(shares.map((r) => r.basis_points)).toEqual([7_000, 3_000]);
  });
});
