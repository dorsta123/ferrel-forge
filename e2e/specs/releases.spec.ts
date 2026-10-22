// Creating and managing a release: live preview, validation, publish/unpublish/archive/delete, locks.
import { gotoReady, newCreator, testEmail, signUp } from "../helpers/accounts";
import { makeWav } from "../helpers/audio";
import { sql } from "../helpers/db";
import { expect, test, PHONE } from "../helpers/fixtures";
import { fitsWidth, main } from "../helpers/page";

const TRACK_URL = /\/dashboard\/tracks\/[0-9a-f-]{36}$/;

test("a creator takes a release from draft to archive", async ({ open }) => {
  const page = await open();
  const m = main(page);
  const field = (label: string) => m.getByLabel(label, { exact: true });
  const badge = m.getByTestId("status-badge");
  await newCreator(page, "Alice");
  let trackId = "";
  const status = async () => (await sql<{ status: string }[]>`select status from tracks where id = ${trackId}`)[0]?.status;

  await test.step("the create page shows a live card preview", async () => {
    await m.getByRole("link", { name: /New release|Create your first release/ }).first().click();
    await page.waitForURL("**/dashboard/tracks/new");
    await page.waitForLoadState("networkidle");
    await field("Title").fill("Midnight Run");
    await field("Starting price").fill("12.50");
    await field("Copies").fill("50");
    await m.getByLabel("Genre").selectOption("electronic");
    await m.getByLabel("BPM (optional)").fill("124");
    await m.getByLabel("Key (optional)").selectOption("Am");
    await expect(field("URL")).toHaveValue("midnight-run");
    const card = m.getByTestId("track-card");
    for (const text of ["Midnight Run", "Electronic", "124 BPM", "Am"]) await expect(card).toContainText(text);
    await expect(m.getByTestId("card-price")).toHaveText("$12.50");
    await expect(m.getByTestId("card-supply")).toHaveText("50 of 50 left");
  });

  await test.step("invalid values show errors next to the fields", async () => {
    await field("Title").fill("");
    await field("Starting price").fill("0.50");
    await m.getByRole("button", { name: "Create draft" }).click();
    await expect(m.getByText("Give your release a title.")).toBeVisible();
    await expect(m.getByText(/Price is \$1\.00/)).toHaveCount(1);
  });

  await test.step("a valid draft is saved with exactly what was entered", async () => {
    await field("Title").fill("Midnight Run");
    await field("Starting price").fill("12.50");
    await m.getByRole("button", { name: "Create draft" }).click();
    await page.waitForURL(TRACK_URL);
    trackId = page.url().split("/").pop()!;
    await expect(m.getByRole("heading", { name: "Midnight Run", level: 1 })).toBeVisible();
    const [row] = await sql`select status, slug, base_price_cents, total_supply, bpm, musical_key from tracks where id = ${trackId}`;
    expect(row).toEqual({ status: "draft", slug: "midnight-run", base_price_cents: 1250, total_supply: 50, bpm: 124, musical_key: "Am" });
    await expect(badge).toHaveText("Draft");
  });

  await test.step("Publish stays disabled until audio is uploaded, and says why", async () => {
    await expect(m.getByRole("button", { name: "Publish" })).toBeDisabled();
    await expect(m.getByText("Upload the audio file before publishing.")).toHaveCount(1);
  });

  await test.step("after uploading, publishing locks the URL and the audio", async () => {
    await m.getByLabel("Choose an audio file").setInputFiles({ name: "midnight-run.wav", mimeType: "audio/wav", buffer: makeWav() });
    await expect(page.getByText("uploaded and verified")).toBeVisible({ timeout: 20_000 });
    await expect(m.getByRole("button", { name: "Publish" })).toBeEnabled();
    await m.getByRole("button", { name: "Publish" }).click();
    await expect(badge).toHaveText("Published");
    expect(await status()).toBe("published");
    await expect(field("URL")).toBeDisabled();
    await expect(m.getByText("Audio can only be changed while the track is a draft.")).toHaveCount(1);
  });

  await test.step("details stay editable; saving keeps the dropdown values", async () => {
    const save = m.getByRole("button", { name: "Save changes" });
    await expect(save).toBeDisabled();
    await field("Title").fill("Midnight Run (Extended)");
    await save.click();
    await expect(m.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await expect(m.getByRole("heading", { name: "Midnight Run (Extended)", level: 1 })).toBeVisible();
    // React 19 resets forms after an action; selects must still show the saved values.
    await expect(m.getByLabel("Genre")).toHaveValue("electronic");
    await expect(m.getByLabel("Key (optional)")).toHaveValue("Am");
    await m.getByLabel("Description (optional)").fill("Late-night drive.\nSecond line.");
    await save.click();
    await expect(m.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    const [row] = await sql`select title, genre, musical_key from tracks where id = ${trackId}`;
    expect(row).toEqual({ title: "Midnight Run (Extended)", genre: "electronic", musical_key: "Am" });
  });

  await test.step("unpublishing returns to draft with the URL still locked", async () => {
    await m.getByRole("button", { name: "Unpublish" }).click();
    await expect(badge).toHaveText("Draft");
    expect(await status()).toBe("draft");
    await expect(field("URL")).toBeDisabled();
    await m.getByRole("button", { name: "Publish" }).click();
    await expect(badge).toHaveText("Published");
  });

  await test.step("after a sale (simulated), copies and price lock and only Archive remains", async () => {
    await sql`update tracks set copies_sold = 2 where id = ${trackId}`;
    await page.reload();
    await expect(field("Copies")).toBeDisabled();
    await expect(field("Starting price")).toBeDisabled();
    await expect(m.getByRole("button", { name: "Unpublish" })).toHaveCount(0);
    await expect(m.getByRole("button", { name: "Archive" })).toHaveCount(1);
    await expect(m.getByTestId("card-supply")).toHaveText("48 of 50 left");
    await expect(m.getByTestId("card-price")).toHaveText("$13.00");
  });

  await test.step("archiving asks for confirmation, then makes the release read-only", async () => {
    await m.getByRole("button", { name: "Archive" }).click();
    await expect(m.getByRole("alertdialog")).toBeVisible();
    await m.getByRole("button", { name: "Yes, archive" }).click();
    await expect(badge).toHaveText("Archived");
    expect(await status()).toBe("archived");
    await expect(field("Title")).toBeDisabled();
    await expect(m.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  });

  await test.step("a repeated title gets URL -2, and deleting that draft returns to the dashboard", async () => {
    await gotoReady(page, "/dashboard/tracks/new");
    await field("Title").fill("Midnight Run");
    await m.getByLabel("Genre").selectOption("lo-fi");
    await m.getByRole("button", { name: "Create draft" }).click();
    await page.waitForURL(TRACK_URL);
    const dupId = page.url().split("/").pop()!;
    await expect(badge).toHaveText("Draft");
    expect((await sql`select slug from tracks where id = ${dupId}`)[0].slug).toBe("midnight-run-2");
    await m.getByRole("button", { name: "Delete draft" }).click();
    await m.getByRole("button", { name: "Yes, delete draft" }).click();
    await page.waitForURL("/dashboard");
    expect(await sql`select 1 from tracks where id = ${dupId}`).toHaveLength(0);
  });

  await test.step("other creators, buyers and visitors can't get in", async () => {
    const bob = await open();
    await newCreator(bob, "Bob");
    await bob.goto(`/dashboard/tracks/${trackId}`);
    await expect(bob.getByText(/could not be found/i)).toBeVisible();
    await expect(main(bob).getByRole("heading", { name: /Midnight Run/ })).toHaveCount(0);

    const buyer = await open();
    await signUp(buyer, { name: "Carol", email: testEmail("carol") });
    await buyer.goto("/dashboard/tracks/new");
    await expect(buyer).toHaveURL(/\/become-creator$/);

    const anon = await open();
    await anon.goto("/dashboard/tracks/new");
    await expect(anon).toHaveURL(/\/sign-in$/);
  });

  await test.step("both pages fit a phone in the light theme", async () => {
    const phone = await open({ viewport: PHONE, theme: "light", as: page });
    for (const path of ["/dashboard/tracks/new", `/dashboard/tracks/${trackId}`]) {
      await phone.goto(path);
      await expect(main(phone).getByLabel("Title", { exact: true })).toBeVisible();
      expect(await fitsWidth(phone), path).toBe(true);
    }
  });
});
