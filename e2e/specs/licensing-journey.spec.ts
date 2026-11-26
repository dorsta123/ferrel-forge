// Phase 5 part 4: the whole licensing journey in one browser test — split → the contributor
// accepts → the advertiser adds a card → licenses → downloads the master → extends; the
// licensed track can't be unpublished.
import { readFile } from "node:fs/promises";
import { createUploadUrl, newMasterKey } from "@ferrel/storage";
import { newCreator, PASSWORD, signUp, testEmail } from "../helpers/accounts";
import { makeWav } from "../helpers/audio";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test } from "../helpers/fixtures";
import { main } from "../helpers/page";

test("split → accept → card → license → download → extend; the licensed track stays up", async ({ open }) => {
  // A published track with a real master in private storage.
  const artistPage = await open();
  const artist = await newCreator(artistPage, "Alice");
  const artistId = await userIdByEmail(artist.email);
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre) values (${artistId}, 'Whole Journey', 'whole-journey', 'pop') returning id`;
  const wav = makeWav(1);
  const key = newMasterKey(artistId, trackId, "wav");
  const url = await createUploadUrl({ bucket: "masters", key, contentType: "audio/wav", contentLength: wav.length });
  expect((await fetch(url, { method: "PUT", body: new Uint8Array(wav), headers: { "content-type": "audio/wav" } })).status).toBe(200);
  await sql`update tracks set audio_key = ${key}, audio_size_bytes = ${wav.length}, audio_format = 'wav', audio_status = 'ready',
            duration_ms = 1000, status = 'published', published_at = now() where id = ${trackId}`;
  const a = main(artistPage);
  const releaseUrl = `/creators/${artist.slug}/whole-journey`;
  let inviteLink = "";

  await test.step("the artist splits the track 80/20 with a producer", async () => {
    await artistPage.goto(`/dashboard/tracks/${trackId}`);
    await artistPage.waitForLoadState("networkidle");
    await a.getByRole("button", { name: "Add contributor" }).click();
    const row = a.getByTestId("split-row").nth(1);
    await row.getByLabel("Name").fill("Pat Producer");
    await row.getByLabel("Role").selectOption("producer");
    await row.getByLabel("Share %").fill("20");
    await a.getByTestId("split-row").nth(0).getByLabel("Share %").fill("80");
    await a.getByRole("button", { name: "Save split" }).click();
    await expect(a.getByTestId("split-status")).toContainText("1 of 2 accepted");
    await a.getByRole("button", { name: "Get invite link" }).click();
    inviteLink = await a.getByLabel("Invite link for Pat Producer").inputValue();
  });

  await test.step("the producer signs up from the link and accepts", async () => {
    const pat = await open();
    await pat.goto(inviteLink);
    await pat.waitForURL(/\/sign-in\?next=/);
    await pat.waitForLoadState("networkidle");
    await main(pat).getByRole("link", { name: "Sign up" }).click();
    await pat.waitForURL(/\/sign-up\?next=/);
    await pat.waitForLoadState("networkidle");
    await pat.getByLabel("Name").fill("Pat Producer");
    await pat.getByLabel("Email").fill(testEmail("pat"));
    await pat.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await pat.getByLabel("Confirm password").fill(PASSWORD);
    await pat.getByRole("button", { name: "Create account" }).click();
    await pat.waitForURL(/\/splits\/invite\//);
    await pat.waitForLoadState("networkidle");
    await main(pat).getByRole("button", { name: "Accept my share" }).click();
    await pat.waitForURL("**/splits");
  });

  const buyer = await open();
  const b = main(buyer);
  await test.step("an advertiser adds a card and licenses the track", async () => {
    await signUp(buyer, { name: "Brand Buyer", email: testEmail("buyer") });
    await buyer.goto(`${releaseUrl}/license`);
    await buyer.waitForLoadState("networkidle");
    await b.getByRole("button", { name: "Add simulated test card" }).click();
    await expect(b.getByTestId("saved-card")).toHaveText("Visa ending 4242");
    await b.getByLabel("Instagram").check();
    await b.getByLabel("Paris").check();
    await b.getByLabel("Company or brand").fill("Acme");
    await b.getByLabel("Billing country").selectOption("FR");
    await b.getByLabel("I agree to these license terms").check();
    await b.getByRole("button", { name: "License this track" }).click();
    await buyer.waitForURL(/\/licenses\?new=/);
    await expect(b.getByTestId("license-card")).toContainText("Active");
  });

  await test.step("they download the full-quality master", async () => {
    const [download] = await Promise.all([buyer.waitForEvent("download"), b.getByRole("link", { name: "Download master" }).click()]);
    expect(download.suggestedFilename()).toBe("whole-journey.wav");
    expect(await readFile(await download.path())).toEqual(wav);
  });

  await test.step("they extend it by 90 days at the same locked rate", async () => {
    const before = await b.getByTestId("license-dates").textContent();
    await b.getByRole("button", { name: "Extend" }).click();
    await b.getByLabel("90 days").check();
    await b.getByRole("button", { name: "Confirm extension" }).click();
    await expect(b.getByTestId("license-card")).toContainText("Extended by 90 days");
    expect(await b.getByTestId("license-dates").textContent()).not.toBe(before);
    const [l] = await sql<{ term_days: number; extended_days: number; locked: number }[]>`
      select l.term_days, l.extended_days, v.version as locked from licenses l join split_versions v on v.id = l.split_version_id
      where l.track_id = ${trackId}`;
    expect(l).toEqual({ term_days: 30, extended_days: 90, locked: 1 });
  });

  await test.step("the artist can't unpublish the licensed track, and is told why", async () => {
    await artistPage.reload();
    await artistPage.waitForLoadState("networkidle");
    await expect(a.getByRole("button", { name: "Unpublish" })).toBeDisabled();
    await expect(a.getByText("Releases with active licenses can't be unpublished")).toBeVisible();
    await expect(a.getByRole("button", { name: "Archive" })).toBeEnabled();
  });
});
