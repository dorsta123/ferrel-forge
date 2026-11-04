// Phase 4 end to end, with the real worker and FFmpeg (slice 12): a creator uploads a song, the
// worker measures it and makes the preview, the creator picks a start, a new preview is made,
// the release is published, and a visitor plays the preview without the master ever being requested.
import { bucketId } from "@ferrel/storage";
import { newCreator } from "../helpers/accounts";
import { makeWav } from "../helpers/audio";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test } from "../helpers/fixtures";
import { main } from "../helpers/page";
import { startWorker } from "../helpers/worker";

let stopWorker: (() => Promise<void>) | undefined;
test.beforeAll(async () => {
  stopWorker = await startWorker();
});
test.afterAll(async () => {
  await stopWorker?.();
});

test("upload → measured → preview → pick a start → publish → a visitor plays it", async ({ open }) => {
  const page = await open();
  const m = main(page);
  const alice = await newCreator(page, "Alice");
  const aliceId = await userIdByEmail(alice.email);
  const [creator] = await sql<{ slug: string }[]>`select slug from creator_profiles where user_id = ${aliceId}`;
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre, base_price_cents)
    values (${aliceId}, 'Midnight Run', 'midnight-run', 'electronic', 1000) returning id`;
  const previewKey = async () => (await sql<{ key: string | null }[]>`select preview_key as key from tracks where id = ${trackId}`)[0].key;

  await page.goto(`/dashboard/tracks/${trackId}`);
  await page.waitForLoadState("networkidle");
  const status = m.getByTestId("audio-status");

  await test.step("the creator uploads a 30 s song; the worker measures it and makes a preview", async () => {
    await m.getByLabel("Choose an audio file").setInputFiles({ name: "midnight-run.wav", mimeType: "audio/wav", buffer: makeWav(30) });
    await expect(page.getByText("uploaded and verified")).toBeVisible({ timeout: 20_000 });
    await expect(status).toContainText("Ready", { timeout: 60_000 });
    await expect(status).toContainText("0:30");
    await expect(status).toContainText("Preview ready", { timeout: 60_000 });
  });

  await test.step("the creator moves the preview to the very start; a new preview is made", async () => {
    const first = await previewKey();
    await page.reload();
    await page.waitForLoadState("networkidle");
    const slider = m.getByRole("region", { name: "Preview" }).getByRole("slider", { name: "Preview start" });
    await expect(slider).toHaveAttribute("aria-valuetext", "Starts at 0:08 of 0:30"); // the default, 25% in
    await slider.focus();
    await page.keyboard.press("Home");
    await m.getByRole("button", { name: "Save start point" }).click();
    await expect(status).toContainText("Preview ready", { timeout: 60_000 });
    await expect.poll(previewKey, { timeout: 60_000 }).not.toBe(first);
  });

  await test.step("the creator publishes", async () => {
    await m.getByRole("button", { name: "Publish" }).click();
    await expect(m.getByTestId("status-badge")).toHaveText("Published");
  });

  await test.step("a visitor plays the preview; the master is never requested", async () => {
    const visitor = await open();
    const requested: string[] = [];
    visitor.on("request", (r) => requested.push(r.url()));
    const v = main(visitor);
    await visitor.goto(`/creators/${creator.slug}/midnight-run`);
    await v.getByRole("button", { name: "Play preview" }).click();
    await expect(v.getByRole("button", { name: "Pause preview" })).toBeVisible();
    await expect(v.getByTestId("player-time")).not.toHaveText(/^0:00 \//, { timeout: 15_000 });
    expect(requested.some((u) => u.includes(`/${bucketId("previews")}/`))).toBe(true);
    expect(requested.some((u) => u.includes(`/${bucketId("masters")}/`))).toBe(false);
  });
});
