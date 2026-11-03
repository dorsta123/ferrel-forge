// The artist picks where the 15-second preview starts, or turns previews off (phase 4 slice 9).
// No worker runs during browser tests: the test checks what the editor asks for.
import { newCreator } from "../helpers/accounts";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test } from "../helpers/fixtures";
import { main } from "../helpers/page";

test("a creator moves the preview window, saves it, and switches previews off", async ({ open }) => {
  const page = await open();
  const m = main(page);
  const alice = await newCreator(page, "Alice");
  const aliceId = await userIdByEmail(alice.email);
  const waveform = Array.from({ length: 200 }, (_, i) => (i * 37) % 1000);
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre, base_price_cents, audio_key, audio_size_bytes, audio_format, audio_status)
    values (${aliceId}, 'Midnight Run', 'midnight-run', 'electronic', 1000, ${`${aliceId}/x/a.wav`}, 10, 'wav', 'processing') returning id`;
  const stored = async () => (await sql<{ start: number | null; enabled: boolean; key: string | null }[]>`
    select preview_start_ms as start, preview_enabled as enabled, preview_key as key from tracks where id = ${trackId}`)[0];

  await page.goto(`/dashboard/tracks/${trackId}`);
  await page.waitForLoadState("networkidle");
  const preview = m.getByRole("region", { name: "Preview" });
  const slider = preview.getByRole("slider", { name: "Preview start" });

  await test.step("once the track is measured, the window starts about 25% in until the artist chooses", async () => {
    await expect(preview).toContainText("once your track is measured");
    // The worker finishes while the page is open (played here in the database).
    await sql`update tracks set audio_status = 'ready', duration_ms = 222000, waveform = ${waveform},
              preview_key = ${`${trackId}/p.mp3`} where id = ${trackId}`;
    await expect(slider).toHaveAttribute("aria-valuetext", "Starts at 0:56 of 3:42", { timeout: 10_000 });
  });

  await test.step("moving it with the keyboard and saving asks for a new preview", async () => {
    await slider.focus();
    await page.keyboard.press("End"); // the latest start that still fits 15 s
    await expect(slider).toHaveAttribute("aria-valuetext", "Starts at 3:27 of 3:42");
    await preview.getByRole("button", { name: "Save start point" }).click();
    await expect(preview).toContainText("Saved");
    expect(await stored()).toEqual({ start: 207_000, enabled: true, key: null });
    await expect(m.getByTestId("audio-status")).toContainText("Making the preview");
  });

  await test.step("switching previews off saves at once and hides the picker", async () => {
    const toggle = preview.getByRole("switch", { name: "Preview" });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(slider).toHaveCount(0);
    await expect.poll(async () => (await stored()).enabled).toBe(false);
    await expect(m.getByTestId("audio-status")).toContainText("Preview off");
  });
});
