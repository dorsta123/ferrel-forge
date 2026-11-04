// An artist adds a "Listen to the full song" link; visitors get a safe button to it (phase 4 slice 11).
import { newCreator } from "../helpers/accounts";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test } from "../helpers/fixtures";
import { main } from "../helpers/page";

test("a creator adds a full-song link; hostile links are refused; visitors get a safe button", async ({ open }) => {
  const page = await open();
  const m = main(page);
  const alice = await newCreator(page, "Alice");
  const aliceId = await userIdByEmail(alice.email);
  const [creator] = await sql<{ slug: string }[]>`select slug from creator_profiles where user_id = ${aliceId}`;
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre, base_price_cents, status, published_at, audio_key, audio_size_bytes, audio_format, audio_status)
    values (${aliceId}, 'Midnight Run', 'midnight-run', 'electronic', 1000, 'published', now(), ${`${aliceId}/x/a.wav`}, 10, 'wav', 'processing') returning id`;

  await page.goto(`/dashboard/tracks/${trackId}`);
  await page.waitForLoadState("networkidle");
  const field = m.getByLabel("Listen to the full song");

  await test.step("a lookalike site is refused with a clear message", async () => {
    await field.fill("https://youtube.com.evil.com/watch?v=abc");
    await m.getByRole("button", { name: "Save changes" }).click();
    await expect(m.getByText("YouTube, Spotify or SoundCloud")).toBeVisible();
    expect((await sql<{ url: string | null }[]>`select listen_url as url from tracks where id = ${trackId}`)[0].url).toBeNull();
  });

  await test.step("a Spotify link is saved", async () => {
    await field.fill("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");
    await m.getByRole("button", { name: "Save changes" }).click();
    await expect(m.getByText("Saved.")).toBeVisible();
  });

  await test.step("visitors see a button that opens it safely in a new tab", async () => {
    const visitor = await open();
    await visitor.goto(`/creators/${creator.slug}/midnight-run`);
    const link = main(visitor).getByRole("link", { name: /Listen to the full song on Spotify/ });
    await expect(link).toHaveAttribute("href", "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
  });
});
