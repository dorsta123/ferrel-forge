// The editor shows what's happening to the audio and updates by itself (phase 4 slice 8).
// No worker runs during browser tests, so the test plays the worker's part in the database.
import { newCreator } from "../helpers/accounts";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test } from "../helpers/fixtures";
import { main } from "../helpers/page";

test("the audio status updates without reloading, and a failed file blocks publishing", async ({ open }) => {
  const page = await open();
  const m = main(page);
  const alice = await newCreator(page, "Alice");
  const aliceId = await userIdByEmail(alice.email);
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre, base_price_cents, audio_key, audio_size_bytes, audio_format, audio_status)
    values (${aliceId}, 'Midnight Run', 'midnight-run', 'electronic', 1000, ${`${aliceId}/x/a.wav`}, 10, 'wav', 'processing') returning id`;

  await page.goto(`/dashboard/tracks/${trackId}`);
  const status = m.getByTestId("audio-status");

  await test.step("a fresh upload shows Processing", async () => {
    await expect(status).toContainText("Processing");
    await expect(status).toContainText("Measuring your track");
  });

  await test.step("when the worker finishes, the page shows Ready with the length, then the preview", async () => {
    await sql`update tracks set audio_status = 'ready', duration_ms = 222000 where id = ${trackId}`;
    await expect(status).toContainText("Ready", { timeout: 10_000 });
    await expect(status).toContainText("3:42");
    await expect(status).toContainText("Making the preview");
    await sql`update tracks set preview_key = ${`${trackId}/p.mp3`} where id = ${trackId}`;
    await expect(status).toContainText("Preview ready", { timeout: 10_000 });
  });

  await test.step("a failed file shows its reason, blocks publishing, and can be tried again", async () => {
    await sql`update tracks set audio_status = 'failed', audio_error = 'This file has no audio in it.', duration_ms = null, preview_key = null where id = ${trackId}`;
    await page.reload();
    await expect(status).toContainText("Failed");
    await expect(status).toContainText("This file has no audio in it.");
    await expect(m.getByRole("button", { name: "Publish" })).toBeDisabled();

    await status.getByRole("button", { name: "Try again" }).click();
    await expect(status).toContainText("Processing");
    expect((await sql<{ s: string }[]>`select audio_status as s from tracks where id = ${trackId}`)[0].s).not.toBe("failed");
  });
});
